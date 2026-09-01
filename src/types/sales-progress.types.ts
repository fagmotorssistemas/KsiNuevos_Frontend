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
  asesoria_total?: number;
  faltante_total?: number;
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

export type SalesProgressPeriodMode = 'day' | 'week' | 'month';

export type SalesProgressPeriod = {
  mode: SalesProgressPeriodMode;
  desde: string;
  hasta: string;
  /** YYYY-MM del mes que muestran el popover y las semanas */
  viewMonth: string;
};

export type MonthWeek = {
  n: number;
  start: string;
  end: string;
};

export type SalesDailyProgressPayload = {
  fecha: string;
  fecha_desde?: string;
  fecha_hasta?: string;
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
  asesoria_total: number;
  faltante_total: number;
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function clampYmd(iso: string, today: string): string {
  return iso > today ? today : iso;
}

export function monthKeyFromYmd(iso: string): string {
  return iso.slice(0, 7);
}

export function addUtcDaysYmd(iso: string, days: number): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return toYmdUtc(date);
}

export function saturdayOnOrBeforeYmd(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
  return toYmdUtc(date);
}

export function lastDayOfMonthYmd(year: number, month: number): string {
  return toYmdUtc(new Date(Date.UTC(year, month, 0, 12)));
}

export function weeksOfMonth(year: number, month: number): MonthWeek[] {
  const first = `${year}-${pad2(month)}-01`;
  const last = lastDayOfMonthYmd(year, month);
  let cursor = saturdayOnOrBeforeYmd(first);
  const weeks: MonthWeek[] = [];
  let n = 1;
  while (cursor <= last) {
    weeks.push({ n, start: cursor, end: addUtcDaysYmd(cursor, 6) });
    n += 1;
    cursor = addUtcDaysYmd(cursor, 7);
  }
  return weeks;
}

export function dayPeriod(iso: string, today = todayEcuadorDate()): SalesProgressPeriod {
  const day = clampYmd(iso.slice(0, 10), today);
  return { mode: 'day', desde: day, hasta: day, viewMonth: monthKeyFromYmd(day) };
}

export function weekPeriod(
  start: string,
  end: string,
  viewMonth: string,
  today = todayEcuadorDate()
): SalesProgressPeriod {
  return {
    mode: 'week',
    desde: start,
    hasta: clampYmd(end, today),
    viewMonth,
  };
}

export function monthPeriod(
  year: number,
  month: number,
  today = todayEcuadorDate()
): SalesProgressPeriod {
  const desde = `${year}-${pad2(month)}-01`;
  return {
    mode: 'month',
    desde,
    hasta: clampYmd(lastDayOfMonthYmd(year, month), today),
    viewMonth: `${year}-${pad2(month)}`,
  };
}

export function todayPeriod(): SalesProgressPeriod {
  return dayPeriod(todayEcuadorDate());
}
