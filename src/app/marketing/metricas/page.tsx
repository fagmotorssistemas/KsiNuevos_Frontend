'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, ClipboardList, Loader2, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'
import { fetchTopVehiclesByLeads } from '@/app/marketing/metricas/lib/top-leads'
import { CategoryChip } from '@/app/marketing/metricas/lib/ui-blocks'
import type { VehicleCategory } from '@/app/marketing/metricas/lib/inventory-metrics'
import { fetchInventoryWithMetrics } from '@/app/marketing/metricas/lib/inventory-metrics'
import {
  type DailyMetricsReportRow,
  formatReportDateLabel,
  getEcuadorTodayYesterdayYmd,
} from '@/app/marketing/metricas/lib/daily-metrics-report'

function normReportDate(s: string | undefined | null) {
  return String(s ?? '').slice(0, 10)
}

export default function MarketingMetricasPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dayTab, setDayTab] = useState<'ayer' | 'hoy'>('ayer')
  const [rescateWindow, setRescateWindow] = useState<1 | 7>(7)
  const [rescatePriceTier, setRescatePriceTier] = useState<'mayor' | 'menor'>('mayor')
  const RESCATE_PRICE_THRESHOLD = 15000

  /** Historial reciente (solo para pie de página / depuración). */
  const [historyReports, setHistoryReports] = useState<DailyMetricsReportRow[]>([])
  /** Fila para pestaña Ayer: idealmente `report_date = ayer (EC)`; si no existe, última fila con fecha anterior a hoy. */
  const [reportAyer, setReportAyer] = useState<DailyMetricsReportRow | null>(null)
  /** true si no hubo fila exacta para ayer calendario y usamos la última disponible anterior a hoy. */
  const [ayerEsFallback, setAyerEsFallback] = useState(false)
  const [reportHoy, setReportHoy] = useState<DailyMetricsReportRow | null>(null)

  const [alerts, setAlerts] = useState<any[]>([])
  const [lowestCars, setLowestCars] = useState<any[]>([])
  const [brandBars, setBrandBars] = useState<Array<{ brand: string; views: number; retentionAvgPct: number | null }>>([])
  const [brandPage, setBrandPage] = useState(0)
  const BRAND_PAGE_SIZE = 5

  const intervalRef = useRef<number | null>(null)

  const { todayYmd, yesterdayYmd } = getEcuadorTodayYesterdayYmd()

  useEffect(() => {
    if (!supabase) return

    async function load() {
      setError(null)
      setLoading(true)

      try {
        const db = metricsDb(supabase)

        const since7d = new Date()
        since7d.setUTCDate(since7d.getUTCDate() - 7)

        const [
          { data: hist, error: he },
          { data: rawAyer, error: ae },
          { data: rawHoy, error: hoe },
          { data: a, error: ale },
          { data: meta, error: me },
        ] =
          await Promise.all([
            db.from('daily_metrics_report').select('*').order('report_date', { ascending: false }).limit(14),
            db.from('daily_metrics_report').select('*').eq('report_date', yesterdayYmd).maybeSingle(),
            db.from('daily_metrics_report').select('*').eq('report_date', todayYmd).maybeSingle(),
            db.from('metrics_alerts').select('*').order('level', { ascending: true }).limit(50),
            db
              .from('meta_video_metrics')
              .select('parsed_brand, views, retention_rate, fetched_at')
              .gte('fetched_at', since7d.toISOString())
              .limit(5000),
          ])

        if (he) throw he
        if (ae) throw ae
        if (hoe) throw hoe
        if (me) throw me

        const history = (hist ?? []) as DailyMetricsReportRow[]
        setHistoryReports(history)

        let ayerRow = (rawAyer ?? null) as DailyMetricsReportRow | null
        let fallback = false
        if (!ayerRow) {
          const { data: fb, error: fe } = await db
            .from('daily_metrics_report')
            .select('*')
            .lt('report_date', todayYmd)
            .order('report_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (fe) throw fe
          ayerRow = (fb ?? null) as DailyMetricsReportRow | null
          fallback = !!ayerRow
        }
        setReportAyer(ayerRow)
        setAyerEsFallback(fallback && !!ayerRow && normReportDate(ayerRow.report_date) !== yesterdayYmd)

        setReportHoy((rawHoy ?? null) as DailyMetricsReportRow | null)

        if (ale) setAlerts([])
        else setAlerts(a ?? [])

        // Barras: vistas por marca (últimos 7 días desde meta_video_metrics)
        try {
          const rows = (meta ?? []) as Array<{
            parsed_brand?: string | null
            views?: number | null
            retention_rate?: number | null
          }>
          const map = new Map<string, { views: number; retSum: number; retN: number }>()
          for (const r of rows) {
            const brand = (r.parsed_brand ?? 'Sin marca').trim() || 'Sin marca'
            const cur = map.get(brand) ?? { views: 0, retSum: 0, retN: 0 }
            cur.views += r.views ?? 0
            if (r.retention_rate != null) {
              cur.retSum += r.retention_rate
              cur.retN += 1
            }
            map.set(brand, cur)
          }
          const agg = [...map.entries()]
            .map(([brand, v]) => ({
              brand,
              views: v.views,
              retentionAvgPct: v.retN ? (v.retSum / v.retN) * 100 : null,
            }))
            .sort((x, y) => y.views - x.views)
          setBrandBars(agg)
          setBrandPage(0)
        } catch {
          setBrandBars([])
          setBrandPage(0)
        }

        // Autos con MENOS leads en la ventana (hoy=1 día / semana=7 días) — desde interested_cars.
        try {
          const inv = await fetchInventoryWithMetrics(supabase, rescateWindow)
          const candidates = inv.rows.filter((r) => r.leads_window === 0)
          const tiered =
            rescatePriceTier === 'menor'
              ? candidates.filter((r) => (r.price ?? 0) <= RESCATE_PRICE_THRESHOLD)
              : candidates.filter((r) => (r.price ?? 0) > RESCATE_PRICE_THRESHOLD)

          const lowest = tiered
            .slice()
            .sort((a, b) => {
              // Prioridad: mayor precio primero, luego por nombre.
              const ap = a.price ?? 0
              const bp = b.price ?? 0
              if (bp !== ap) return bp - ap
              return String(a.vehicle_label).localeCompare(String(b.vehicle_label))
            })
            .slice(0, 5)
            .map((r) => ({
              inventory_id: r.inventory_id,
              vehicle_label: r.vehicle_label,
              leads: r.leads_window,
              category: r.category,
              status: r.status,
              price: r.price ?? null,
            }))
          setLowestCars(lowest)
        } catch {
          // Si falla (por permisos/RLS), nos quedamos vacío.
          setLowestCars([])
        }
      } catch (e: any) {
        setError(String(e?.message ?? e))
      } finally {
        setLoading(false)
      }
    }

    load()

    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(load, 5 * 60 * 1000)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [supabase, todayYmd, yesterdayYmd, rescateWindow, rescatePriceTier])

  const activeReport = dayTab === 'ayer' ? reportAyer : reportHoy

  const firstParagraph = useMemo(() => {
    if (dayTab === 'hoy' || !activeReport?.resumen_ejecutivo) return null
    const parts = String(activeReport.resumen_ejecutivo).split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    return parts[0] ?? null
  }, [activeReport, dayTab])

  const kpisAyer = useMemo(() => {
    const row = reportAyer
    if (!row) {
      return {
        leads: null as number | null,
        leadsVsAyer: null as number | null,
        cpl: null as number | null,
        spend: null as number | null,
        autosPublicados: null as number | null,
        autosSinLeads: null as number | null,
      }
    }
    const cpl = Number(row.costo_por_lead)
    const spend = Number(row.spend_total)
    return {
      leads: typeof row.leads_total === 'number' ? row.leads_total : null,
      leadsVsAyer: row.leads_vs_ayer != null && !Number.isNaN(Number(row.leads_vs_ayer)) ? Number(row.leads_vs_ayer) : null,
      cpl: Number.isFinite(cpl) ? cpl : null,
      spend: Number.isFinite(spend) ? spend : null,
      autosPublicados: typeof row.autos_publicados === 'number' ? row.autos_publicados : null,
      autosSinLeads: typeof row.autos_sin_leads === 'number' ? row.autos_sin_leads : null,
    }
  }, [reportAyer])

  const fmtMoney = (n: number | null) =>
    n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })

  const brandMaxViews = useMemo(() => Math.max(1, ...brandBars.map((b) => b.views)), [brandBars])
  const brandPageCount = useMemo(() => Math.max(1, Math.ceil(brandBars.length / BRAND_PAGE_SIZE)), [brandBars.length])
  const brandBarsPage = useMemo(() => {
    const start = brandPage * BRAND_PAGE_SIZE
    return brandBars.slice(start, start + BRAND_PAGE_SIZE)
  }, [brandBars, brandPage])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-gray-900">Resumen de métricas</p>
            <p className="text-xs text-gray-500 mt-1">
              Las fechas mostradas salen de la columna <code className="font-mono text-[11px]">report_date</code> en base de datos (America/Guayaquil
              solo define qué fila pedimos en «Ayer» / «Hoy»).
            </p>
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setDayTab('ayer')}
              className={[
                'rounded-lg px-4 py-2 text-xs font-extrabold transition',
                dayTab === 'ayer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              Ayer · datos
            </button>
            <button
              type="button"
              onClick={() => setDayTab('hoy')}
              className={[
                'rounded-lg px-4 py-2 text-xs font-extrabold transition',
                dayTab === 'hoy' ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-200' : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              Hoy · en curso
            </button>
          </div>
        </div>

        {dayTab === 'ayer' ? (
          <div className="mt-3 space-y-2">
            {reportAyer ? (
              <>
                <p className="text-sm font-extrabold text-gray-900">
                  Reporte en pantalla:{' '}
                  <span className="text-violet-700">{formatReportDateLabel(reportAyer.report_date)}</span>
                  <span className="font-mono text-xs font-semibold text-gray-500 ml-2">({normReportDate(reportAyer.report_date)})</span>
                </p>
                {ayerEsFallback && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    No hay fila con <code className="font-mono">report_date = {yesterdayYmd}</code>. Se muestra el último reporte anterior a hoy (
                    {todayYmd}).
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-600">
                No hay filas en <code className="font-mono">daily_metrics_report</code> anteriores a hoy ({todayYmd}), o aún no tienes permisos/RLS para
                leerlas.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/90 px-4 py-3 space-y-2">
            <p className="text-xs font-extrabold text-violet-900">Hoy — recolección hasta fin del día</p>
            <p className="text-xs text-violet-950/90 leading-relaxed">
              Los KPI consolidados del cierre corresponden al <code className="font-mono">report_date</code> del día terminado; suelen verse en la
              pestaña «Ayer · datos» cuando el backend guarda la fila.
            </p>
            {reportHoy ? (
              <p className="text-xs text-gray-800">
                Fila en base para hoy:{' '}
                <span className="font-extrabold">{formatReportDateLabel(reportHoy.report_date)}</span>{' '}
                <span className="font-mono text-gray-600">({normReportDate(reportHoy.report_date)})</span> — puede estar incompleta.
              </p>
            ) : (
              <p className="text-xs text-gray-600">
                Aún no existe fila con <code className="font-mono">report_date = {todayYmd}</code>.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>
      )}

      {dayTab === 'ayer' ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-500">Reporte IA</p>
                <p className="text-base font-extrabold text-gray-900 truncate">
                  {reportAyer ? formatReportDateLabel(reportAyer.report_date) : 'Sin reporte'}
                </p>
              </div>
              <Link
                href="/marketing/metricas/reporte"
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-gray-800"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver reporte completo
              </Link>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando…
                </div>
              ) : firstParagraph ? (
                <p className="text-sm text-gray-700 leading-relaxed">{firstParagraph}</p>
              ) : reportAyer ? (
                <p className="text-sm text-gray-500">
                  Hay fila para <span className="font-mono font-semibold">{normReportDate(reportAyer.report_date)}</span>, pero{' '}
                  <code className="font-mono text-xs">resumen_ejecutivo</code> está vacío.
                </p>
              ) : (
                <p className="text-sm text-gray-500">Sin datos de reporte para mostrar.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">Leads totales</p>
                {kpisAyer.leadsVsAyer == null ? null : kpisAyer.leadsVsAyer >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">
                {kpisAyer.leads == null ? '—' : kpisAyer.leads.toLocaleString('es-EC')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {kpisAyer.leadsVsAyer == null
                  ? 'Variación vs día anterior: columna leads_vs_ayer vacía'
                  : `${kpisAyer.leadsVsAyer >= 0 ? '↑' : '↓'} ${Math.abs(kpisAyer.leadsVsAyer).toLocaleString('es-EC', { maximumFractionDigits: 2 })} · leads_vs_ayer (BD)`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Costo por lead</p>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">{fmtMoney(kpisAyer.cpl)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Columna <code className="font-mono text-[10px]">costo_por_lead</code>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Autos publicados</p>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">
                {kpisAyer.autosPublicados == null ? '—' : kpisAyer.autosPublicados.toLocaleString('es-EC')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Columna <code className="font-mono text-[10px]">autos_publicados</code>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">Autos sin leads</p>
                <TriangleAlert className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">
                {kpisAyer.autosSinLeads == null ? '—' : kpisAyer.autosSinLeads.toLocaleString('es-EC')}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500">Orgánico (Meta)</p>
                <p className="text-base font-extrabold text-gray-900">Vistas por marca (últimos 7 días)</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">
                  {brandBars.length} marcas · página {Math.min(brandPage + 1, brandPageCount)} / {brandPageCount}
                </span>
                {loading && (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando…
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-3">
              {brandBarsPage.map((b) => {
                const w = Math.round((b.views / brandMaxViews) * 100)
                return (
                  <div key={b.brand} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-gray-900 truncate">{b.brand}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {b.views.toLocaleString('es-EC')} views · Retención prom.:{' '}
                          <span className="font-bold text-gray-700">
                            {b.retentionAvgPct == null ? '—' : `${Math.round(b.retentionAvgPct)}%`}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-gray-700 shrink-0">{w}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-600" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                )
              })}
              {!loading && brandBars.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  No hay datos recientes en <code className="font-mono text-xs">meta_video_metrics</code> (o no tienes permisos/RLS).
                </div>
              )}
              {!loading && brandBars.length > BRAND_PAGE_SIZE && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBrandPage((p) => Math.max(0, p - 1))}
                    disabled={brandPage <= 0}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandPage((p) => Math.min(brandPageCount - 1, p + 1))}
                    disabled={brandPage >= brandPageCount - 1}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-500">Reporte IA · día en curso</p>
              <p className="text-base font-extrabold text-gray-900">
                {reportHoy ? formatReportDateLabel(reportHoy.report_date) : 'Sin fila para hoy'}
              </p>
            </div>
            <Link
              href="/marketing/metricas/reporte"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-extrabold text-gray-800 hover:bg-gray-50"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Historial de reportes
            </Link>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Hasta el cierre del día en Ecuador, los números pueden cambiar. Cuando exista la fila del día en curso, aquí solo la mostramos como
              referencia; los KPI definitivos son los del <code className="font-mono text-xs">report_date</code> cerrado (pestaña Ayer).
            </p>
            {reportHoy?.resumen_ejecutivo ? (
              <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">{reportHoy.resumen_ejecutivo.slice(0, 400)}…</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500">Alertas activas</p>
              <p className="text-base font-extrabold text-gray-900">Críticas primero</p>
            </div>
            <Link href="/marketing/metricas/alertas" className="text-sm font-extrabold text-gray-700 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {(alerts ?? []).slice(0, 3).map((a, idx) => (
              <div key={a?.id ?? idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-extrabold text-gray-900">{a?.message ?? a?.title ?? 'Alerta'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Nivel: <span className="font-bold">{String(a?.level ?? '—')}</span>
                </p>
              </div>
            ))}
            {(alerts ?? []).length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                No hay alertas disponibles (o no existe la vista/tabla `metrics_alerts`).
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-500">
                Autos sin leads (desde `interested_cars` · ventana {rescateWindow === 1 ? 'hoy' : 'semana'})
              </p>
              <p className="text-base font-extrabold text-gray-900">Top 5 a rescatar</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setRescateWindow(1)}
                  className={[
                    'rounded-lg px-3 py-2 text-[11px] font-extrabold transition',
                    rescateWindow === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setRescateWindow(7)}
                  className={[
                    'rounded-lg px-3 py-2 text-[11px] font-extrabold transition',
                    rescateWindow === 7 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  Semana
                </button>
              </div>

              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setRescatePriceTier('mayor')}
                  className={[
                    'rounded-lg px-3 py-2 text-[11px] font-extrabold transition',
                    rescatePriceTier === 'mayor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  Mayor precio (&gt; {RESCATE_PRICE_THRESHOLD.toLocaleString('es-EC')})
                </button>
                <button
                  type="button"
                  onClick={() => setRescatePriceTier('menor')}
                  className={[
                    'rounded-lg px-3 py-2 text-[11px] font-extrabold transition',
                    rescatePriceTier === 'menor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  Menor precio (≤ {RESCATE_PRICE_THRESHOLD.toLocaleString('es-EC')})
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-bold px-5 py-3">Auto</th>
                  <th className="text-left font-bold px-5 py-3">Precio</th>
                  <th className="text-left font-bold px-5 py-3">Leads</th>
                  <th className="text-left font-bold px-5 py-3">Categoría</th>
                  <th className="text-left font-bold px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(lowestCars ?? []).map((r, idx) => {
                  const catRaw = r?.category
                  const catKnown = ['URGENTE', 'RESCATE', 'ROTACION', 'ESTRELLA'].includes(String(catRaw))
                    ? (String(catRaw) as VehicleCategory)
                    : '—'
                  return (
                    <tr key={r?.inventory_id ?? idx} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-bold text-gray-900">{r?.vehicle_label ?? r?.title ?? r?.inventory_id ?? '—'}</td>
                      <td className="px-5 py-3">
                        {r?.price == null ? '—' : Number(r.price).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-5 py-3">{typeof r?.leads === 'number' ? r.leads.toLocaleString('es-EC') : '—'}</td>
                      <td className="px-5 py-3">
                        {catKnown === '—' ? (
                          <span className="text-xs text-gray-500">{catRaw ?? '—'}</span>
                        ) : (
                          <CategoryChip category={catKnown} />
                        )}
                      </td>
                      <td className="px-5 py-3">{r?.status ?? '—'}</td>
                    </tr>
                  )
                })}
                {(lowestCars ?? []).length === 0 && !loading && (
                  <tr className="border-t border-gray-100">
                    <td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>
                      No hay autos sin leads que cumplan el filtro (o no hay permisos para leer `inventoryoracle` / `interested_cars`).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-500">
        Filas cargadas en historial (últimas 14 por fecha):{' '}
        <span className="font-bold text-gray-700">{historyReports.length}</span>. Actualización automática cada 5 minutos.
      </div>
    </div>
  )
}
