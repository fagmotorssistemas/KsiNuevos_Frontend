import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { FinancialAdvisoryRow, FinancialAdvisoryStatus } from "@/types/finance-advisory.types";

export function useLeadFinancialAdvisory(leadId: number) {
  const { supabase } = useAuth();
  const [records, setRecords] = useState<FinancialAdvisoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asesoria_financiamiento")
        .select("*")
        .eq("lead_id", leadId)
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((row) => ({
        ...row,
        estado: row.estado ?? "pendiente",
      })) as FinancialAdvisoryRow[];

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

  return { records, loading, updateRecord, updating, refresh: fetchRecords };
}
