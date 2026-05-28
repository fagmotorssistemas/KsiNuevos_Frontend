import type { DailyMetricsReportRow } from './daily-metrics-report'
import { parseRecommendationsList } from './ui-blocks'

/** Texto de secciones + objeto auxiliar para sidebar (todo desde columnas planas). */
export function parseDailyReportSections(row: DailyMetricsReportRow | Record<string, unknown> | null) {
  if (!row) {
    return {
      resumen: null as string | null,
      guiones: null as string | null,
      marca: null as string | null,
      recomendaciones: null as string | string[] | null,
      datos: null as Record<string, unknown> | null,
    }
  }

  const r = row as Partial<DailyMetricsReportRow>

  const resumen = typeof r.resumen_ejecutivo === 'string' ? r.resumen_ejecutivo : null
  const guiones = typeof r.analisis_guiones === 'string' ? r.analisis_guiones : null
  const marca = typeof r.analisis_marcas === 'string' ? r.analisis_marcas : null
  const recParsed = parseRecommendationsList(r.recomendaciones)
  const recomendaciones = recParsed.length > 0 ? recParsed : null

  const datos = {
    leads_total: r.leads_total,
    spend_total: r.spend_total,
    costo_por_lead: r.costo_por_lead,
    mejor_tipo_guion: r.mejor_tipo_guion,
    peor_tipo_guion: r.peor_tipo_guion,
    mejor_marca: r.mejor_marca,
    leads_vs_ayer: r.leads_vs_ayer,
    conversion_vs_ayer: r.conversion_vs_ayer,
    leads_organico: r.leads_organico,
    leads_pagado: r.leads_pagado,
  }

  return { resumen, guiones, marca, recomendaciones, datos }
}
