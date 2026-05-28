'use client'

import { useEffect, useMemo, useState } from 'react'
import { getISOWeek } from 'date-fns'
import {
  BarChart3,
  Clapperboard,
  Lightbulb,
  Loader2,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'

const SEMANA_TIPOS: Array<{ n: number; label: string; desc: string; accent: string }> = [
  { n: 1, label: 'Tipo 1', desc: 'Venta / Informativo / Educativo', accent: 'emerald' },
  { n: 2, label: 'Tipo 2', desc: 'Frío', accent: 'sky' },
  { n: 3, label: 'Tipo 3', desc: 'Comparación', accent: 'violet' },
  { n: 4, label: 'Tipo 4', desc: 'Objeción', accent: 'amber' },
]

const ACCENT_STYLES: Record<string, { active: string; idle: string }> = {
  emerald: {
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/50',
    idle: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300',
  },
  sky: {
    active: 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200/50',
    idle: 'bg-sky-50 text-sky-800 border-sky-200 hover:border-sky-300',
  },
  violet: {
    active: 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200/50',
    idle: 'bg-violet-50 text-violet-800 border-violet-200 hover:border-violet-300',
  },
  amber: {
    active: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200/50',
    idle: 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300',
  },
}

type AggRow = {
  tipo: string
  count: number
  avgRetention: number | null
  avgViews: number | null
}

function rankStyle(idx: number) {
  if (idx === 0) return 'bg-amber-100 text-amber-800 ring-amber-200'
  if (idx === 1) return 'bg-slate-200 text-slate-700 ring-slate-300'
  if (idx === 2) return 'bg-orange-100 text-orange-800 ring-orange-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export default function MetricasGuionesPerformancePage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AggRow[]>([])
  const [brandRows, setBrandRows] = useState<Array<{ brand: string; best: string; worst: string; hook: string }>>([])

  useEffect(() => {
    if (!supabase) return
    const db = metricsDb(supabase)
    setLoading(true)
    setError(null)

    const since = new Date()
    since.setUTCDate(since.getUTCDate() - 90)

    ;(async () => {
      try {
        const { data: scripts, error: se } = await db
          .from('video_scripts')
          .select(
            `
            id,
            guion_tipo,
            semana_tipo,
            status,
            fecha_publicacion,
            updated_at,
            inventoryoracle:inventoryoracle (brand)
          `
          )
          .eq('status', 'publicado')
          .gte('updated_at', since.toISOString())

        if (se) throw se

        const list = (scripts ?? []) as Array<{
          id: string
          guion_tipo?: string | null
          inventoryoracle?: { brand?: string | null } | { brand?: string | null }[] | null
        }>
        const ids = list.map((s) => s.id).filter(Boolean)

        let metricsByScript = new Map<string, { retention: number | null; views: number | null }>()
        if (ids.length) {
          const { data: met, error: me } = await db
            .from('video_script_metrics')
            .select('script_id, retention_rate, views')
            .in('script_id', ids)
          if (!me && met) {
            for (const m of met as Array<{
              script_id?: string
              retention_rate?: number | null
              views?: number | null
            }>) {
              if (!m.script_id) continue
              metricsByScript.set(m.script_id, {
                retention: m.retention_rate ?? null,
                views: m.views ?? null,
              })
            }
          }
        }

        const map = new Map<
          string,
          { tipo: string; count: number; retSum: number; retN: number; viewSum: number; viewN: number }
        >()

        for (const s of list) {
          const tipo = (s.guion_tipo ?? 'Sin tipo').trim() || 'Sin tipo'
          const cur = map.get(tipo) ?? { tipo, count: 0, retSum: 0, retN: 0, viewSum: 0, viewN: 0 }
          cur.count += 1
          const mm = metricsByScript.get(s.id)
          if (mm?.retention != null) {
            cur.retSum += mm.retention
            cur.retN += 1
          }
          if (mm?.views != null) {
            cur.viewSum += mm.views
            cur.viewN += 1
          }
          map.set(tipo, cur)
        }

        const agg: AggRow[] = [...map.values()]
          .map((r) => ({
            tipo: r.tipo,
            count: r.count,
            avgRetention: r.retN ? (r.retSum / r.retN) * 100 : null,
            avgViews: r.viewN ? r.viewSum / r.viewN : null,
          }))
          .sort((a, b) => (b.avgViews ?? b.count) - (a.avgViews ?? a.count))

        setRows(agg)

        const byBrand = new Map<string, Map<string, number>>()
        for (const s of list) {
          const inv = s.inventoryoracle
          const brandRaw = Array.isArray(inv) ? inv[0]?.brand : inv?.brand
          const brand = (brandRaw ?? 'Sin marca').toString().trim() || 'Sin marca'
          const tipo = (s.guion_tipo ?? 'Sin tipo').trim() || 'Sin tipo'
          const m = byBrand.get(brand) ?? new Map<string, number>()
          m.set(tipo, (m.get(tipo) ?? 0) + 1)
          byBrand.set(brand, m)
        }

        const hookByBrand = new Map<string, string>()
        const { data: metaB, error: metaErr } = await db
          .from('meta_video_metrics')
          .select('parsed_brand, title, views')
          .not('parsed_brand', 'is', null)
          .gte('fetched_at', since.toISOString())

        if (!metaErr && metaB) {
          const tmp = new Map<string, { title: string; views: number }>()
          for (const row of metaB as Array<{
            parsed_brand?: string | null
            title?: string | null
            views?: number | null
          }>) {
            const b = (row.parsed_brand ?? '').trim()
            if (!b) continue
            const key = b.toLowerCase()
            const title = (row.title ?? '').trim() || '—'
            const v = row.views ?? 0
            const cur = tmp.get(key)
            if (!cur || v > cur.views) tmp.set(key, { title, views: v })
          }
          for (const [k, v] of tmp) hookByBrand.set(k, v.title)
        }

        const brandsOut: Array<{ brand: string; best: string; worst: string; hook: string }> = []
        for (const [brand, m] of byBrand) {
          const pairs = [...m.entries()].sort((a, b) => b[1] - a[1])
          const best = pairs[0]?.[0] ?? '—'
          const worst = pairs.length > 1 ? pairs[pairs.length - 1][0] : '—'
          brandsOut.push({
            brand,
            best,
            worst: worst === best ? '—' : worst,
            hook: hookByBrand.get(brand.toLowerCase()) ?? '—',
          })
        }
        brandsOut.sort((a, b) => a.brand.localeCompare(b.brand))
        setBrandRows(brandsOut.slice(0, 40))
      } catch (e: unknown) {
        setError(String((e as Error)?.message ?? e))
        setRows([])
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase])

  const isoWeek = getISOWeek(new Date())
  const semanaTipoActual = ((isoWeek - 1) % 4) + 1
  const semanaActual = SEMANA_TIPOS.find((s) => s.n === semanaTipoActual)

  const insight = useMemo(() => {
    if (rows.length < 2) return null
    const byViews = [...rows].sort((a, b) => (b.avgViews ?? 0) - (a.avgViews ?? 0))
    const best = byViews[0]
    const worst = byViews[byViews.length - 1]
    if (!best || !worst || best.tipo === worst.tipo) return null
    const mult =
      best.avgViews && worst.avgViews && worst.avgViews > 0
        ? (best.avgViews / worst.avgViews).toFixed(1)
        : null
    return { best: best.tipo, worst: worst.tipo, mult }
  }, [rows])

  const maxBar = useMemo(() => Math.max(1, ...rows.map((r) => r.avgViews ?? r.count)), [rows])

  const totalGuiones = useMemo(() => rows.reduce((n, r) => n + r.count, 0), [rows])
  const topTipo = rows[0]?.tipo ?? '—'

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600">
            Performance de guiones
          </p>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Guiones publicados · últimos ~90 días
          </p>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm">
              <Clapperboard className="h-3.5 w-3.5 text-violet-600" />
              {totalGuiones} publicados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
              {rows.length} tipos
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {/* Calendario semanal */}
      <div className="rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/30 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-600/10 px-2.5 py-1 text-[11px] font-extrabold text-violet-800">
              <Sparkles className="h-3.5 w-3.5" />
              Semana ISO {isoWeek}
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              Esta semana:{' '}
              <span className="text-violet-700">{semanaActual?.desc ?? '—'}</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600 font-medium max-w-xl">
              Calendario de referencia por rotación de 4 semanas. Las métricas inferiores provienen de
              guiones ya publicados.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {SEMANA_TIPOS.map((st) => {
            const active = st.n === semanaTipoActual
            const styles = ACCENT_STYLES[st.accent]
            return (
              <div
                key={st.n}
                className={[
                  'rounded-2xl border px-3 py-3 transition-all',
                  active ? styles.active : styles.idle,
                ].join(' ')}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-90">
                  {st.label}
                  {active ? ' · ahora' : ''}
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight">{st.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insight */}
      {insight && (
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Insight de la ventana</p>
              <p className="mt-1.5 text-sm text-slate-700 leading-relaxed font-medium">
                Los formatos de tipo{' '}
                <span className="font-extrabold text-amber-900">{insight.best}</span>
                {insight.mult ? (
                  <>
                    {' '}
                    concentran ~<span className="font-extrabold text-amber-900">{insight.mult}×</span> más
                    vistas promedio que{' '}
                    <span className="font-extrabold text-amber-900">{insight.worst}</span>.
                  </>
                ) : (
                  <>
                    {' '}
                    muestran mejor promedio de vistas que{' '}
                    <span className="font-extrabold text-amber-900">{insight.worst}</span>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ranking por tipo */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Rendimiento por tipo de guion</p>
              <p className="text-xs text-slate-500 font-medium">
                Ordenado por vistas promedio · top: {topTipo}
              </p>
            </div>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-violet-500" />}
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {rows.map((r, idx) => {
            const barValue = r.avgViews ?? r.count
            const widthPct = Math.round((barValue / maxBar) * 100)
            return (
              <div
                key={r.tipo}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={[
                        'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold ring-1 ring-inset',
                        rankStyle(idx),
                      ].join(' ')}
                    >
                      {idx < 3 ? <Trophy className="h-4 w-4" /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 truncate">{r.tipo}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {r.count} guion{r.count === 1 ? '' : 'es'} publicados
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {r.avgViews == null ? '—' : Math.round(r.avgViews).toLocaleString('es-EC')}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-slate-500">vistas prom.</p>
                  </div>
                </div>

                <div className="mt-3 h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80">
                    Retención{' '}
                    <span className="ml-1 font-extrabold text-slate-900">
                      {r.avgRetention == null ? '—' : `${Math.round(r.avgRetention)}%`}
                    </span>
                  </span>
                </div>
              </div>
            )
          })}

          {!loading && rows.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-10">
              No hay guiones publicados en el rango o falló la consulta.
            </p>
          )}
        </div>
      </div>

      {/* Por marca */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">Comportamiento por marca</p>
            <p className="text-xs text-slate-500 font-medium">
              Mejor / peor tipo de guion · hook ganador en video orgánico
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                <th className="text-left px-5 py-3.5">Marca</th>
                <th className="text-left px-4 py-3.5">Mejor tipo</th>
                <th className="text-left px-4 py-3.5">Peor tipo</th>
                <th className="text-left px-5 py-3.5 min-w-[200px]">Hook ganador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brandRows.map((b) => (
                <tr key={b.brand} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-extrabold text-slate-900">{b.brand}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-800 ring-1 ring-inset ring-emerald-200/60">
                      {b.best}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700 ring-1 ring-inset ring-slate-200">
                      {b.worst}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium max-w-[320px] truncate" title={b.hook}>
                    {b.hook}
                  </td>
                </tr>
              ))}
              {!loading && brandRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    Sin datos por marca. Revisa la relación video_scripts → inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
