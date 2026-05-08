'use client'

import { useEffect, useMemo, useState } from 'react'
import { getISOWeek } from 'date-fns'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'

const SEMANA_DESC: Record<number, string> = {
  1: 'Venta / Informativo / Educativo',
  2: 'Frío',
  3: 'Comparación',
  4: 'Objeción',
}

type AggRow = {
  tipo: string
  count: number
  avgRetention: number | null
  avgViews: number | null
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
          const { data: met, error: me } = await db.from('video_script_metrics').select('script_id, retention_rate, views').in('script_id', ids)
          if (!me && met) {
            for (const m of met as Array<{ script_id?: string; retention_rate?: number | null; views?: number | null }>) {
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
          for (const row of metaB as Array<{ parsed_brand?: string | null; title?: string | null; views?: number | null }>) {
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
      } catch (e: any) {
        setError(String(e?.message ?? e))
        setRows([])
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase])

  const isoWeek = getISOWeek(new Date())
  const semanaTipoActual = ((isoWeek - 1) % 4) + 1
  const semanaLabel = SEMANA_DESC[semanaTipoActual] ?? '—'

  const insight = useMemo(() => {
    if (rows.length < 2) return null
    const byViews = [...rows].sort((a, b) => (b.avgViews ?? 0) - (a.avgViews ?? 0))
    const best = byViews[0]
    const worst = byViews[byViews.length - 1]
    if (!best || !worst || best.tipo === worst.tipo) return null
    const mult =
      best.avgViews && worst.avgViews && worst.avgViews > 0 ? (best.avgViews / worst.avgViews).toFixed(1) : null
    return { best: best.tipo, worst: worst.tipo, mult }
  }, [rows])

  const maxBar = useMemo(() => Math.max(1, ...rows.map((r) => r.avgViews ?? r.count)), [rows])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>}

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <p className="text-xs font-bold text-violet-700">Semana ISO {isoWeek}</p>
        <p className="mt-1 text-sm font-extrabold text-gray-900">
          Esta semana es tipo <span className="text-violet-700">{semanaTipoActual}</span>: {semanaLabel}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Tipos de contenido por calendario (referencia). Los datos de abajo salen de guiones publicados recientes.
        </p>
      </div>

      {insight && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5 shadow-sm">
          <p className="text-sm font-extrabold text-gray-900">
            💡 Los formatos de tipo <span className="text-amber-900">{insight.best}</span>
            {insight.mult ? (
              <>
                {' '}
                concentran ~<span className="text-amber-900">{insight.mult}x</span> más vistas promedio que{' '}
                <span className="text-amber-900">{insight.worst}</span> en la ventana analizada.
              </>
            ) : (
              <> muestran mejor promedio de vistas que {insight.worst}.</>
            )}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">Rendimiento por tipo de guion</p>
            <p className="text-base font-extrabold text-gray-900">Últimos ~90 días · publicados</p>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          {rows.map((r, idx) => {
            const widthPct = Math.round(((r.avgViews ?? r.count) / maxBar) * 100)
            const medal = idx < 3 ? medals[idx] : null
            return (
              <div key={r.tipo} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    {medal && <span className="text-lg shrink-0">{medal}</span>}
                    <p className="font-extrabold text-gray-900 truncate">{r.tipo}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500 shrink-0">{r.count} guiones</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${widthPct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                  <span>
                    Vistas prom.:{' '}
                    <span className="font-extrabold text-gray-900">{r.avgViews == null ? '—' : Math.round(r.avgViews).toLocaleString('es-EC')}</span>
                  </span>
                  <span>
                    Retención prom.:{' '}
                    <span className="font-extrabold text-gray-900">{r.avgRetention == null ? '—' : `${Math.round(r.avgRetention)}%`}</span>
                  </span>
                </div>
              </div>
            )
          })}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-gray-500">No hay guiones publicados en el rango o falló la consulta.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500">Comportamiento por marca (orgánico)</p>
          <p className="text-base font-extrabold text-gray-900">Guiones publicados + marca (Oracle)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-bold px-5 py-3">Marca</th>
                <th className="text-left font-bold px-5 py-3">Mejor tipo</th>
                <th className="text-left font-bold px-5 py-3">Peor tipo</th>
                <th className="text-left font-bold px-5 py-3">Hook ganador (video)</th>
              </tr>
            </thead>
            <tbody>
              {brandRows.map((b) => (
                <tr key={b.brand} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-extrabold text-gray-900">{b.brand}</td>
                  <td className="px-5 py-3 text-gray-700">{b.best}</td>
                  <td className="px-5 py-3 text-gray-700">{b.worst}</td>
                  <td className="px-5 py-3 text-gray-700 max-w-[280px] truncate">{b.hook}</td>
                </tr>
              ))}
              {!loading && brandRows.length === 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-5 py-8 text-gray-500 text-center" colSpan={4}>
                    Sin datos por marca (revisa relación `video_scripts` → `inventoryoracle`).
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
