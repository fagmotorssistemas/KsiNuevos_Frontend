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
  leads_con_cita: number;
  ia_due?: number;
  ia_agendadas?: number;
  ia_pendientes?: number;
  ia_vencidas?: number;
  citas_due?: number;
  citas_gestionadas?: number;
  showroom_visitas?: number;
  showroom_con_gestion?: number;
  hist_contestados_pct?: number;
  hist_cita_pct?: number;
  hist_ia_pct?: number;
  hist_showroom_pct?: number;
  contestados_cuota?: number;
  contestados_hoy?: number;
  contestados_cartera?: number;
  hoy_sin_resumen?: number;
  sin_resumen?: number;
  faltante_quedados?: number;
  asesoria_quedados?: number;
  pedidos_quedados?: number;
  faltante_sin_salir?: number;
  asesoria_sin_salir?: number;
  semana_contestados_pct?: number;
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
  leads_con_cita: number;
  datos_faltantes_hoy: number;
  datos_faltantes_contestados: number;
  ia_due: number;
  ia_agendadas: number;
  ia_pendientes: number;
  ia_vencidas: number;
  citas_due: number;
  citas_gestionadas: number;
  showroom_visitas: number;
  showroom_con_gestion: number;
  asesoria_hoy: number;
  asesoria_llenas: number;
  hist_contestados_pct: number;
  hist_cita_pct: number;
  hist_ia_pct: number;
  hist_showroom_pct: number;
  faltante_quedados: number;
  asesoria_quedados: number;
  pedidos_quedados: number;
  faltante_sin_salir: number;
  asesoria_sin_salir: number;
  asesoria_respondidas: number;
  semana_contestados_pct: number;
  semana_ingresados: number;
  semana_contestados: number;
  contestados_cuota: number;
  contestados_hoy: number;
  contestados_cartera: number;
  hoy_sin_resumen: number;
  sin_resumen: number;
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
