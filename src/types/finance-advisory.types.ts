import { CheckCircle2, Clock, Landmark, Loader2 } from "lucide-react";
import type { Database } from "@/types/supabase";

export type FinancialAdvisoryStatus = Database["public"]["Enums"]["estado_financiamiento"];

type FinancialAdvisoryRowRaw = Database["public"]["Tables"]["asesoria_financiamiento"]["Row"];

export type FinancialAdvisoryRow = Omit<FinancialAdvisoryRowRaw, "estado"> & {
  estado: FinancialAdvisoryStatus;
};

export type FinancialAdvisoryGestionType = "llamada" | "mensaje" | "personal";

export type FinancialAdvisoryGestionRow = {
  id: number;
  asesoria_id: number;
  tipo: FinancialAdvisoryGestionType;
  pdf_urls: string[];
  image_urls: string[];
  se_solicito_cedula: boolean;
  cedula: string | null;
  banco_deseado: string | null;
  asesor_contactado_nombre: string | null;
  asesor_contactado_telefono: string | null;
  gestion_detalle: string | null;
  aplica: boolean | null;
  motivo_no_aplica: string | null;
  requiere_garante: boolean;
  garante_detalle: string | null;
  monto_aprobable_max: number | null;
  plazo_meses_max: number | null;
  created_by: string | null;
  created_at: string;
};

export type FinancialAdvisoryEvidenceRow = {
  id: number;
  gestion_id: number;
  storage_bucket: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
};

export type FinancialAdvisoryRecord = FinancialAdvisoryRow & {
  gestiones: FinancialAdvisoryGestionRow[];
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
