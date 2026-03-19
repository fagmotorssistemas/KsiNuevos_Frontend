import { createClient } from "@/lib/supabase/client";
import type {
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
};
