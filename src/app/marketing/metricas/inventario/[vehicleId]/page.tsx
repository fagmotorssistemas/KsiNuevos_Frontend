'use client'

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Eye,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Users,
  Video,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'
import { computePerformanceScore, type MetaMetricsRow } from '@/components/marketing/MetricasRow'
import { inferCategory, sinceIsoEcuador } from '@/app/marketing/metricas/lib/inventory-metrics'
import { latestSnapshotPerCampaign } from '@/app/marketing/metricas/lib/dashboard-metrics'
import { CategoryChip } from '@/app/marketing/metricas/lib/ui-blocks'

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'slate',
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'
}) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <div className={`rounded-xl p-2 ring-1 ring-inset ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p> : null}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="text-sm font-extrabold text-slate-900 tabular-nums text-right">{value}</span>
    </div>
  )
}

function InventarioDetalleInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const vehicleId = String(params?.vehicleId ?? '')
  const range = (Number(searchParams.get('range')) === 30 ? 30 : 7) as 7 | 30

  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null)
  const [metaRows, setMetaRows] = useState<MetaMetricsRow[]>([])
  const [leadsWindow, setLeadsWindow] = useState(0)
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null)
  const [paid, setPaid] = useState<{
    spend: number
    reach: number
    impressions: number
    clicks: number
    cpl: number | null
  } | null>(null)

  useEffect(() => {
    if (!supabase || !vehicleId) return
    const db = metricsDb(supabase)
    setLoading(true)
    setError(null)

    const sinceIso = sinceIsoEcuador(range)
    const leadsVehicleFilter = `vehicle_uid.eq.${vehicleId},inventory_id.eq.${vehicleId}`
    Promise.all([
      db.from('inventoryoracle').select('*').eq('id', vehicleId).maybeSingle(),
      db
        .from('meta_video_metrics')
        .select(
          'video_id, created_time, permalink_url, title, caption, parsed_brand, parsed_model, parsed_year, inventory_vehicle_id, views, avg_time_watched_s, retention_rate, comments_count, shares_count, fetched_at'
        )
        .eq('inventory_vehicle_id', vehicleId),
      db
        .from('interested_cars')
        .select('id', { count: 'exact', head: true })
        .or(leadsVehicleFilter),
      db
        .from('interested_cars')
        .select('id', { count: 'exact', head: true })
        .or(leadsVehicleFilter)
        .gte('created_at', sinceIso),
      db
        .from('meta_ad_vehicle_metrics')
        .select(
          'campaign_id, spend, reach_sum, impressions_sum, clicks_sum, cost_per_lead, leads_count, updated_at'
        )
        .eq('inventory_id', vehicleId),
    ])
      .then(([vRes, mRes, tRes, wRes, pRes]) => {
        if (vRes.error) throw vRes.error
        if (mRes.error) throw mRes.error
        setVehicle((vRes.data as Record<string, unknown>) ?? null)
        setMetaRows((mRes.data ?? []) as MetaMetricsRow[])
        setLeadsTotal(typeof tRes.count === 'number' ? tRes.count : null)
        setLeadsWindow(typeof wRes.count === 'number' ? wRes.count : 0)

        if (pRes.error) {
          console.error('meta_ad_vehicle_metrics', pRes.error)
          setPaid(null)
        } else if (Array.isArray(pRes.data) && pRes.data.length) {
          type PaidRow = {
            campaign_id: string
            updated_at?: string | null
            spend?: number
            reach_sum?: number
            impressions_sum?: number
            clicks_sum?: number
            cost_per_lead?: number | null
            leads_count?: number
          }
          const rows = latestSnapshotPerCampaign(pRes.data as PaidRow[])
          const spend = rows.reduce((a, r) => a + (Number(r.spend) || 0), 0)
          const reach = rows.reduce((a, r) => a + (Number(r.reach_sum) || 0), 0)
          const impressions = rows.reduce((a, r) => a + (Number(r.impressions_sum) || 0), 0)
          const clicks = rows.reduce((a, r) => a + (Number(r.clicks_sum) || 0), 0)
          const leads = rows.reduce((a, r) => a + (Number(r.leads_count) || 0), 0)
          const cpl = leads > 0 ? spend / leads : null
          setPaid({ spend, reach, impressions, clicks, cpl })
        } else {
          setPaid(null)
        }
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [supabase, vehicleId, range])

  const aggregates = useMemo(() => {
    let views = 0
    let comments = 0
    let shares = 0
    let retentionSum = 0
    let retentionN = 0
    let scoreSum = 0
    for (const r of metaRows) {
      views += r.views ?? 0
      comments += r.comments_count ?? 0
      shares += r.shares_count ?? 0
      if (r.retention_rate != null) {
        retentionSum += r.retention_rate
        retentionN += 1
      }
      scoreSum += computePerformanceScore(r)
    }
    const avgRetention = retentionN ? (retentionSum / retentionN) * 100 : null
    const score = metaRows.length ? Math.min(100, Math.round(scoreSum / metaRows.length)) : null
    return { views, comments, shares, avgRetention, score, videoCount: metaRows.length }
  }, [metaRows])

  const category = useMemo(() => {
    const created = vehicle?.created_at ? new Date(String(vehicle.created_at)).getTime() : Date.now()
    const daysListed = Math.max(0, Math.floor((Date.now() - created) / 86400000))
    return inferCategory(leadsWindow, daysListed, range)
  }, [vehicle, leadsWindow, range])

  const recommendation = useMemo(() => {
    if (!vehicle) return ''
    if (leadsWindow === 0 && aggregates.views > 2000)
      return 'Hay vistas pero no leads: revisa precio publicado, llamado a la acción en video y velocidad de respuesta del equipo.'
    if (leadsWindow >= (range >= 30 ? 16 : 5))
      return 'Buen rendimiento de leads en la ventana: mantén stock de contenido y refuerza el inventario similar.'
    if ((aggregates.avgRetention ?? 0) < 20)
      return 'Retención baja en video: prueba hooks más cortos y primera frase orientada a beneficio.'
    return 'Equilibrio medio: prioriza un guion de objeción/comparación y valida coincidencia inventario ↔ campaña pagada.'
  }, [vehicle, leadsWindow, aggregates.views, aggregates.avgRetention, range])

  const label = useMemo(() => {
    if (!vehicle) return vehicleId
    const parts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean)
    const plate = vehicle.plate ? String(vehicle.plate) : null
    if (plate) parts.push(`· ${plate}`)
    return parts.join(' ') || vehicleId
  }, [vehicle, vehicleId])

  const statusLabel = vehicle?.status != null ? String(vehicle.status) : '—'
  const priceLabel =
    vehicle?.price != null && !Number.isNaN(Number(vehicle.price))
      ? Number(vehicle.price).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
      : null

  const backHref = '/marketing/metricas/inventario'
  const rangeHref = (d: 7 | 30) =>
    `/marketing/metricas/inventario/${vehicleId}?range=${d}`

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Inventario
        </Link>
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
          {([7, 30] as const).map((d) => (
            <Link
              key={d}
              href={rangeHref(d)}
              className={[
                'rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
                range === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {d} días
            </Link>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          Cargando detalle del vehículo…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {!loading && !vehicle && !error && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 font-medium">
          No se encontró el vehículo.
        </div>
      )}

      {vehicle && !loading && (
        <>
          {/* Hero */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                  Detalle de inventario
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{label}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CategoryChip category={category} />
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600 capitalize">
                    {statusLabel}
                  </span>
                  {priceLabel ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 ring-1 ring-inset ring-emerald-200/60">
                      {priceLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs font-mono text-slate-400 truncate max-w-md" title={vehicleId}>
                  {vehicleId}
                </p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatTile
              label="Leads totales"
              value={leadsTotal == null ? '—' : leadsTotal.toLocaleString('es-EC')}
              sub="Histórico en interested_cars"
              icon={Users}
              accent="indigo"
            />
            <StatTile
              label={`Leads (${range}d)`}
              value={leadsWindow.toLocaleString('es-EC')}
              sub="Ventana Ecuador"
              icon={Target}
              accent={leadsWindow > 0 ? 'emerald' : 'rose'}
            />
            <StatTile
              label="Views video"
              value={aggregates.views.toLocaleString('es-EC')}
              sub={
                aggregates.videoCount
                  ? `${aggregates.videoCount} video${aggregates.videoCount === 1 ? '' : 's'}`
                  : 'Sin videos vinculados'
              }
              icon={Eye}
              accent="slate"
            />
            <StatTile
              label="Score efectividad"
              value={aggregates.score == null ? '—' : String(aggregates.score)}
              sub="Promedio 0–100"
              icon={BarChart3}
              accent="amber"
            />
          </div>

          {/* Orgánico + Pagado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Orgánico</p>
                  <p className="text-xs text-slate-500 font-medium">Métricas de video en Meta</p>
                </div>
              </div>
              <div className="px-5 sm:px-6 py-2">
                <MetricRow label="Views" value={aggregates.views.toLocaleString('es-EC')} />
                <MetricRow
                  label="Retención prom."
                  value={aggregates.avgRetention == null ? '—' : `${Math.round(aggregates.avgRetention)}%`}
                />
                <MetricRow label="Comentarios" value={aggregates.comments.toLocaleString('es-EC')} />
                <MetricRow label="Shares" value={aggregates.shares.toLocaleString('es-EC')} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Pagado (Meta)</p>
                  <p className="text-xs text-slate-500 font-medium">Campañas por vehículo</p>
                </div>
              </div>
              {paid ? (
                <div className="px-5 sm:px-6 py-2">
                  <MetricRow
                    label="Spend"
                    value={paid.spend.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                  />
                  <MetricRow label="Alcance" value={paid.reach.toLocaleString('es-EC')} />
                  <MetricRow label="Impresiones" value={paid.impressions.toLocaleString('es-EC')} />
                  <MetricRow label="Clics" value={paid.clicks.toLocaleString('es-EC')} />
                  <MetricRow
                    label="CPL (prom.)"
                    value={
                      paid.cpl == null
                        ? '—'
                        : paid.cpl.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
                    }
                  />
                </div>
              ) : (
                <div className="px-5 sm:px-6 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-600">Sin datos de campaña</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    No hay filas en meta_ad_vehicle_metrics para este vehículo. Cuando exista inversión
                    pagada, aparecerá aquí.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recomendación */}
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-5 sm:p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-900">Recomendación</p>
                  {aggregates.score != null && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-xs font-extrabold text-amber-900 ring-1 ring-amber-200/60">
                      <Sparkles className="h-3.5 w-3.5" />
                      Score {aggregates.score}/100
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed font-medium">{recommendation}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function MetricasInventarioDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          Cargando…
        </div>
      }
    >
      <InventarioDetalleInner />
    </Suspense>
  )
}
