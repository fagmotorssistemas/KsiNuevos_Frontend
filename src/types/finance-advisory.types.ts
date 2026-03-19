import { CheckCircle2, Clock, Landmark, Loader2 } from "lucide-react";
import type { Database } from "@/types/supabase";

export type FinancialAdvisoryStatus = Database["public"]["Enums"]["estado_financiamiento"];

type FinancialAdvisoryRowRaw = Database["public"]["Tables"]["asesoria_financiamiento"]["Row"];

export type FinancialAdvisoryRow = Omit<FinancialAdvisoryRowRaw, "estado"> & {
  estado: FinancialAdvisoryStatus;
};

export const FINANCIAL_ADVISORY_STATUS_CONFIG: Record<
  FinancialAdvisoryStatus,
  { label: string; color: string; icon: any }
> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Clock,
  },
  en_proceso: {
    label: "En Proceso",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Loader2,
  },
  resuelto: {
    label: "Resuelto",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

export const FINANCIAL_ADVISORY_ICON = Landmark;
