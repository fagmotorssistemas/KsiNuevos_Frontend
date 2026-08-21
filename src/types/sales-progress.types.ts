export type SalesProgressAxis = 'actividad' | 'avance' | 'penalizacion';
export type SalesProgressRol = 'diario' | 'estrancado' | 'excluido';

export type SalesProgressCategoryRow = {
  categoria: string;
  label: string;
  axis: SalesProgressAxis;
  cantidad: number;
  puntos_brutos: number;
  puntos: number;
  cap: number;
};

export type SalesProgressRankingRow = {
  vendedor_id: string;
  nombre: string;
  rol: SalesProgressRol;
  puntos_total: number;
  puntos_actividad: number;
  puntos_avance: number;
  puntos_penalizacion: number;
  stale_leads: number;
  leads_ingresados: number;
  leads_con_historial: number;
  backlog_abiertos: number;
};

export type SalesProgressTrendPoint = {
  fecha: string;
  puntos_total: number;
  porcentaje: number;
  vendedores: number;
  puntos_actividad: number;
  puntos_avance: number;
};

export type SalesDailyProgressPayload = {
  fecha: string;
  vendedor_id: string;
  vendedor_nombre: string;
  rol: SalesProgressRol;
  es_admin: boolean;
  leads_ingresados: number;
  leads_con_historial: number;
  backlog_abiertos: number;
  categorias: SalesProgressCategoryRow[];
  puntos_actividad: number;
  puntos_avance: number;
  puntos_penalizacion: number;
  puntos_total: number;
  stale_leads: number;
  stale_lead_names: string[];
  promedio_equipo: number;
  ranking: SalesProgressRankingRow[];
  tendencia: SalesProgressTrendPoint[];
};

export type SalesProgressSeller = {
  id: string;
  full_name: string;
  rol?: SalesProgressRol;
};

export type SalesProgressEventRow = {
  occurred_at: string;
  lead_id: number | null;
  lead_name: string | null;
  lead_phone: string | null;
  titulo: string;
  detalle: string | null;
  recurso: string;
};

export function todayEcuadorDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}
