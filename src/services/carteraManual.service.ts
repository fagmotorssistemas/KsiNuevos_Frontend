import { createClient } from "@/lib/supabase/client";
import type {
  CarteraManualDeleteRequest,
  CarteraManualCreatePayload,
  CarteraManualRow,
  CarteraManualUpdate,
} from "@/types/carteraManual.types";

function computeDiasMora(proximo: string | null | undefined): number {
  if (!proximo) return 0;
  const v = new Date(proximo + "T12:00:00");
  if (Number.isNaN(v.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  v.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - v.getTime()) / (86400000));
  return diff > 0 ? diff : 0;
}

export const carteraManualService = {
  async listActive(): Promise<CarteraManualRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cartera_manual")
      .select("*")
      .eq("activo", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CarteraManualRow[];
  },

  async getById(id: string): Promise<CarteraManualRow | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cartera_manual")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as CarteraManualRow) ?? null;
  },

  async create(
    payload: CarteraManualCreatePayload,
    userId: string | undefined,
  ): Promise<CarteraManualRow> {
    const supabase = createClient();
    const dias_mora =
      payload.dias_mora ?? computeDiasMora(payload.proximo_vencimiento ?? null);
    const { data, error } = await supabase
      .from("cartera_manual")
      .insert({
        ...payload,
        dias_mora,
        created_by: userId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CarteraManualRow;
  },

  async update(
    id: string,
    payload: CarteraManualUpdate,
  ): Promise<CarteraManualRow> {
    const supabase = createClient();
    const patch = { ...payload };
    if (patch.proximo_vencimiento !== undefined && patch.dias_mora === undefined) {
      patch.dias_mora = computeDiasMora(patch.proximo_vencimiento);
    }
    const { data, error } = await supabase
      .from("cartera_manual")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CarteraManualRow;
  },

  async softDelete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("cartera_manual")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async createDeleteRequest(
    carteraManualId: string,
    motivo: string,
    requestedBy: string | undefined,
  ): Promise<void> {
    if (!requestedBy) throw new Error("No se pudo identificar el usuario.");
    const supabase = createClient();
    const reason = motivo.trim();
    if (!reason) throw new Error("El motivo es obligatorio.");

    const { error } = await supabase
      .from("cartera_manual_delete_requests")
      .insert({
        cartera_manual_id: carteraManualId,
        motivo: reason,
        requested_by: requestedBy,
      });
    if (error) throw error;

    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    if (adminError || !admins?.length) return;

    const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const title = `Solicitud eliminar obligación ${carteraManualId.slice(0, 8)}...`;
    const { error: taskError } = await supabase.from("tasks").insert(
      admins.map((admin) => ({
        user_id: admin.id,
        created_by: requestedBy,
        title,
        priority: "alta",
        due_date: dueDate,
        is_completed: false,
      })),
    );
    if (taskError) console.error("No se pudo notificar a admins:", taskError);
  },

  async listDeleteRequests(
    status: "pendiente" | "aprobada" | "rechazada" = "pendiente",
  ): Promise<(CarteraManualDeleteRequest & { cartera_manual: CarteraManualRow | null })[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cartera_manual_delete_requests")
      .select("*, cartera_manual(*)")
      .eq("estado", status)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (CarteraManualDeleteRequest & {
      cartera_manual: CarteraManualRow | null;
    })[];
  },

  async resolveDeleteRequest(
    requestId: string,
    approve: boolean,
    adminId: string | undefined,
    reviewNote?: string,
  ): Promise<void> {
    if (!adminId) throw new Error("No se pudo identificar al administrador.");
    const supabase = createClient();
    const nextStatus = approve ? "aprobada" : "rechazada";

    const { data: reqRow, error: reqError } = await supabase
      .from("cartera_manual_delete_requests")
      .update({
        estado: nextStatus,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote?.trim() || null,
      })
      .eq("id", requestId)
      .eq("estado", "pendiente")
      .select("*")
      .single();
    if (reqError) throw reqError;

    if (approve) {
      await this.softDelete(reqRow.cartera_manual_id);
    }
  },
};
