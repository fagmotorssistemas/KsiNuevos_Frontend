/** Fila alineada a `public.daily_metrics_report` (columnas planas). */
export type DailyMetricsReportRow = {
  id: string
  report_date: string
  leads_total: number
  leads_organico: number
  leads_pagado: number
  autos_publicados: number
  autos_sin_leads: number
  mejor_tipo_guion: string | null
  peor_tipo_guion: string | null
  mejor_marca: string | null
  spend_total: number
  costo_por_lead: number
  resumen_ejecutivo: string | null
  analisis_guiones: string | null
  analisis_marcas: string | null
  recomendaciones: string | null
  alertas: unknown | null
  leads_vs_ayer: number | null
  conversion_vs_ayer: number | null
  raw_data: unknown | null
  generated_at?: string
  created_at?: string
}

export function ecuadorCalendarParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { y: get('year'), m: get('month'), day: get('day') }
}

function addCalendarDaysUtc(y: number, m: number, day: number, delta: number) {
  const t = Date.UTC(y, m - 1, day + delta)
  const nd = new Date(t)
  return { y: nd.getUTCFullYear(), m: nd.getUTCMonth() + 1, day: nd.getUTCDate() }
}

export function toYmd(y: number, m: number, day: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Hoy y ayer como `YYYY-MM-DD` según calendario Ecuador (para filtrar `report_date` en SQL). */
export function getEcuadorTodayYesterdayYmd() {
  const { y, m, day } = ecuadorCalendarParts()
  const todayYmd = toYmd(y, m, day)
  const prev = addCalendarDaysUtc(y, m, day, -1)
  const yesterdayYmd = toYmd(prev.y, prev.m, prev.day)
  return { todayYmd, yesterdayYmd }
}

/** Fecha de hoy en Ecuador como `YYYY-MM-DD`. */
export function getEcuadorTodayYmd() {
  const { y, m, day } = ecuadorCalendarParts()
  return toYmd(y, m, day)
}

/**
 * Etiqueta legible para `report_date` (DATE en Postgres, sin hora).
 * Usamos mediodía UTC para no desfasar el día al formatear en Guayaquil.
 */
export function formatReportDateLabel(reportDate: string | undefined | null) {
  if (!reportDate) return '—'
  const raw = String(reportDate).slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return String(reportDate)
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  const s = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(utcNoon))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
