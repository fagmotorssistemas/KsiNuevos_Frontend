import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type {
  FinancialAdvisoryGestionRow,
  FinancialAdvisoryGestionType,
  FinancialAdvisoryRecord,
  FinancialAdvisoryRow,
  FinancialAdvisoryStatus,
} from "@/types/finance-advisory.types";

export function useLeadFinancialAdvisory(leadId: number) {
  const { supabase, user } = useAuth();
  const [records, setRecords] = useState<FinancialAdvisoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      // Intentamos traer el modelo extendido (gestiones + evidencias).
      // Si la DB aún no tiene las tablas nuevas o PostgREST no reconoce la relación,
      // hacemos fallback a la tabla base para no romper el módulo.
      let data: any[] | null = null;
      let error: any = null;

      {
        // Nota: el tipado de selects anidados puede volverse muy profundo.
        // Para evitar errores de TS por instanciación excesiva, tipamos este query como `any`.
        const res = await (supabase.from("asesoria_financiamiento") as any)
          .select(
            `
              *,
              asesoria_financiamiento_gestion (
                *,
                pdf_urls,
                image_urls
              )
            `
          )
          .eq("lead_id", leadId)
          .order("fecha_solicitud", { ascending: false })
          .order("created_at", { foreignTable: "asesoria_financiamiento_gestion", ascending: false });

        data = res.data;
        error = res.error;
      }

      if (error) {
        const msg = String(error?.message || error);
        const looksLikeMissingRelation =
          msg.toLowerCase().includes("relationship") ||
          msg.toLowerCase().includes("foreign key") ||
          msg.toLowerCase().includes("could not find") ||
          msg.toLowerCase().includes("schema cache");

        if (looksLikeMissingRelation) {
          const fallback = await supabase
            .from("asesoria_financiamiento")
            .select("*")
            .eq("lead_id", leadId)
            .order("fecha_solicitud", { ascending: false });
          data = fallback.data as any[] | null;
          if (fallback.error) throw fallback.error;
        } else {
          throw error;
        }
      }

      const normalized = (data || []).map((row: any) => {
        const base = {
          ...row,
          estado: row.estado ?? "pendiente",
        } as FinancialAdvisoryRow;

        const gestionesRaw = (row.asesoria_financiamiento_gestion || []) as any[];
        const gestiones = gestionesRaw.map((g) => {
          return {
            ...(g as FinancialAdvisoryGestionRow),
            pdf_urls: Array.isArray(g.pdf_urls) ? g.pdf_urls : [],
            image_urls: Array.isArray(g.image_urls) ? g.image_urls : [],
          } as FinancialAdvisoryGestionRow;
        });

        return {
          ...(base as FinancialAdvisoryRow),
          gestiones,
        } as FinancialAdvisoryRecord;
      }) as FinancialAdvisoryRecord[];

      setRecords(normalized);
    } catch (err) {
      console.error("Error fetching financial advisory records:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId, supabase]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const updateRecord = async (id: number, newStatus: FinancialAdvisoryStatus, notes: string) => {
    try {
      setUpdating(id);

      const updatePayload: {
        estado: FinancialAdvisoryStatus;
        notas_vendedor: string;
        fecha_resolucion?: string | null;
      } = {
        estado: newStatus,
        notas_vendedor: notes,
      };

      if (newStatus === "resuelto") {
        updatePayload.fecha_resolucion = new Date()
          .toLocaleString("sv-SE", { timeZone: "America/Guayaquil" })
          .replace(" ", "T");
      } else {
        updatePayload.fecha_resolucion = null;
      }

      const { error } = await supabase.from("asesoria_financiamiento").update(updatePayload).eq("id", id);
      if (error) throw error;

      setRecords((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                ...updatePayload,
              }
            : row
        )
      );

      return { success: true };
    } catch (err) {
      console.error("Error updating financial advisory record:", err);
      return { success: false, error: err };
    } finally {
      setUpdating(null);
    }
  };

  const createGestion = async (
    asesoriaId: number,
    payload: Partial<Omit<FinancialAdvisoryGestionRow, "id" | "asesoria_id" | "created_at" | "created_by">> & {
      tipo: FinancialAdvisoryGestionType;
    }
  ) => {
    if (!user) return { success: false, error: "not_authenticated" as const };
    try {
      const { data, error } = await supabase
        .from("asesoria_financiamiento_gestion")
        .insert({
          asesoria_id: asesoriaId,
          tipo: payload.tipo,
          pdf_urls: payload.pdf_urls ?? [],
          image_urls: payload.image_urls ?? [],
          se_solicito_cedula: payload.se_solicito_cedula ?? false,
          cedula: payload.cedula ?? null,
          banco_deseado: payload.banco_deseado ?? null,
          asesor_contactado_nombre: payload.asesor_contactado_nombre ?? null,
          asesor_contactado_telefono: payload.asesor_contactado_telefono ?? null,
          gestion_detalle: payload.gestion_detalle ?? null,
          aplica: payload.aplica ?? null,
          motivo_no_aplica: payload.motivo_no_aplica ?? null,
          requiere_garante: payload.requiere_garante ?? false,
          garante_detalle: payload.garante_detalle ?? null,
          monto_aprobable_max: payload.monto_aprobable_max ?? null,
          plazo_meses_max: payload.plazo_meses_max ?? null,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (error) throw error;
      await fetchRecords();
      return { success: true, data };
    } catch (err) {
      console.error("Error creating gestion:", err);
      return { success: false, error: err };
    }
  };

  const updateGestion = async (
    gestionId: number,
    payload: Partial<Omit<FinancialAdvisoryGestionRow, "id" | "asesoria_id" | "created_at" | "created_by">>
  ) => {
    if (!user) return { success: false, error: "not_authenticated" as const };
    try {
      const { error } = await supabase
        .from("asesoria_financiamiento_gestion")
        .update({
          ...payload,
        })
        .eq("id", gestionId);
      if (error) throw error;
      await fetchRecords();
      return { success: true };
    } catch (err) {
      console.error("Error updating gestion:", err);
      return { success: false, error: err };
    }
  };

  const uploadEvidence = async (gestionId: number, file: File) => {
    if (!user) return { success: false, error: "not_authenticated" as const };
    try {
      setUploadingEvidence(true);

      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      // No depende de tabla evidencia: solo subimos y devolvemos URL pública.
      // Si aún no existe gestionId (draft), usamos 0 como carpeta temporal.
      const folderGestion = Number.isFinite(gestionId) && gestionId > 0 ? String(gestionId) : "draft";
      const path = `${user.id}/${leadId}/${folderGestion}/${Date.now()}_${safeName}`;
      const bucket = "asesorias-financiamiento";

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("No se pudo obtener publicUrl del archivo subido.");
      return { success: true, publicUrl, path };
    } catch (err) {
      console.error("Error uploading evidence:", err);
      return { success: false, error: err };
    } finally {
      setUploadingEvidence(false);
    }
  };

  return {
    records,
    loading,
    updateRecord,
    updating,
    uploadingEvidence,
    refresh: fetchRecords,
    createGestion,
    updateGestion,
    uploadEvidence,
  };
}
