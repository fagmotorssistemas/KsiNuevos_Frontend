'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, MessageCircle, Share2, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { RetentionBadge } from '@/components/marketing/badges'
import { computePerformanceScore, type MetaMetricsRow } from '@/components/marketing/MetricasRow'

type ScriptLite = {
  id: string
  facebook_post_id: string | null
  status: string | null
}

export default function MarketingMetricasPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [metrics, setMetrics] = useState<MetaMetricsRow[]>([])
  const [scripts, setScripts] = useState<ScriptLite[]>([])

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    async function run() {
      const [{ data: m, error: me }, { data: s, error: se }] = await Promise.all([
        (supabase as unknown as { from: (t: string) => any })
          .from('meta_video_metrics')
          .select(
            'video_id, created_time, permalink_url, title, caption, parsed_brand, parsed_model, parsed_year, inventory_vehicle_id, views, avg_time_watched_s, retention_rate, comments_count, shares_count, fetched_at'
          )
          .order('retention_rate', { ascending: false })
          .limit(500),
        (supabase as unknown as { from: (t: string) => any }).from('video_scripts').select('id, facebook_post_id, status').limit(1000),
      ])

      if (me) throw me
      if (se) throw se

      setMetrics((m ?? []) as MetaMetricsRow[])
      setScripts((s ?? []) as ScriptLite[])
    }

    run()
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [supabase])

  const kpis = useMemo(() => {
    const views = metrics.reduce((acc, r) => acc + (r.views ?? 0), 0)
    const retentionAvg =
      metrics.length === 0 ? null : metrics.reduce((acc, r) => acc + (r.retention_rate ?? 0), 0) / metrics.length
    const comments = metrics.reduce((acc, r) => acc + (r.comments_count ?? 0), 0)
    const shares = metrics.reduce((acc, r) => acc + (r.shares_count ?? 0), 0)

    const generated = scripts.filter((s) => (s.status ?? '').toLowerCase() === 'generado').length
    const published = scripts.filter((s) => (s.status ?? '').toLowerCase() === 'publicado').length

    return { views, retentionAvg, comments, shares, generated, published }
  }, [metrics, scripts])

  const top5 = useMemo(() => metrics.slice().sort((a, b) => (b.retention_rate ?? 0) - (a.retention_rate ?? 0)).slice(0, 5), [metrics])
  const bottom5 = useMemo(() => metrics.slice().sort((a, b) => (a.retention_rate ?? 0) - (b.retention_rate ?? 0)).slice(0, 5), [metrics])

  const orphans = useMemo(() => {
    const scriptVideoIds = new Set(scripts.map((s) => s.facebook_post_id).filter(Boolean) as string[])
    return metrics.filter((m) => !m.inventory_vehicle_id || !scriptVideoIds.has(m.video_id)).slice(0, 30)
  }, [metrics, scripts])

  function MetricTable({ title, rows }: { title: string; rows: MetaMetricsRow[] }) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
          <span className="text-xs text-gray-500 font-semibold">{rows.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-bold px-5 py-3">Video</th>
                <th className="text-left font-bold px-5 py-3">Retención</th>
                <th className="text-left font-bold px-5 py-3">Vistas</th>
                <th className="text-left font-bold px-5 py-3">Comentarios</th>
                <th className="text-left font-bold px-5 py-3">Shares</th>
                <th className="text-left font-bold px-5 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.video_id} className="border-t border-gray-100">
                  <td className="px-5 py-3">
                    <div className="min-w-[260px]">
                      <p className="font-bold text-gray-900 truncate">{r.title ?? r.video_id}</p>
                      <p className="text-xs text-gray-500 truncate">{r.permalink_url ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <RetentionBadge retentionRate={r.retention_rate} />
                  </td>
                  <td className="px-5 py-3">{(r.views ?? 0).toLocaleString('es-EC')}</td>
                  <td className="px-5 py-3">{r.comments_count ?? 0}</td>
                  <td className="px-5 py-3">{r.shares_count ?? 0}</td>
                  <td className="px-5 py-3 font-bold text-gray-900">{Math.round(computePerformanceScore(r))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Métricas y Performance
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Resumen de rendimiento y aprendizaje para mejorar guiones y producción.
          </p>
        </div>

        {loading && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Vistas acumuladas</p>
            <Eye className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{kpis.views.toLocaleString('es-EC')}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Retención promedio</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">
            {kpis.retentionAvg === null ? '—' : `${Math.round(kpis.retentionAvg * 100)}%`}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Comentarios</p>
            <MessageCircle className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{kpis.comments.toLocaleString('es-EC')}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Shares</p>
            <Share2 className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{kpis.shares.toLocaleString('es-EC')}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-700">
          Guiones: <span className="font-extrabold text-gray-900">{kpis.published}</span> publicados /{' '}
          <span className="font-extrabold text-gray-900">{kpis.generated}</span> generados
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MetricTable title="Top 5 mejores por retención" rows={top5} />
        <MetricTable title="Peores 5 por retención" rows={bottom5} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-gray-900">Videos sin guion asociado / huérfanos</h2>
          <p className="text-xs text-gray-500 mt-1">
            Detecta publicaciones que no pasaron por el flujo de guiones o sin vínculo de inventario.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {orphans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No se detectaron huérfanos en el dataset actual.
            </div>
          ) : (
            orphans.map((o) => (
              <div key={o.video_id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{o.title ?? o.video_id}</p>
                    <p className="text-xs text-gray-500 truncate">{o.permalink_url ?? '—'}</p>
                    <p className="mt-2 text-xs text-gray-600">
                      Inventario: <span className="font-bold">{o.inventory_vehicle_id ?? 'NULL'}</span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <RetentionBadge retentionRate={o.retention_rate} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

