'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'
import { computePerformanceScore, type MetaMetricsRow } from '@/components/marketing/MetricasRow'
import { inferCategory } from '@/app/marketing/metricas/lib/inventory-metrics'
import { CategoryChip } from '@/app/marketing/metricas/lib/ui-blocks'

function InventarioDetalleInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const vehicleId = String(params?.vehicleId ?? '')
  const range = (Number(searchParams.get('range')) === 30 ? 30 : 7) as 7 | 30

  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [metaRows, setMetaRows] = useState<MetaMetricsRow[]>([])
  const [leadsWindow, setLeadsWindow] = useState(0)
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null)
  const [paid, setPaid] = useState<{ spend: number; reach: number; clicks: number; cpl: number | null } | null>(null)

  useEffect(() => {
    if (!supabase || !vehicleId) return
    const db = metricsDb(supabase)
    setLoading(true)
    setError(null)

    const since = new Date()
    since.setUTCDate(since.getUTCDate() - range)

    Promise.all([
      db.from('inventoryoracle').select('*').eq('id', vehicleId).maybeSingle(),
      db
        .from('meta_video_metrics')
        .select(
          'video_id, created_time, permalink_url, title, caption, parsed_brand, parsed_model, parsed_year, inventory_vehicle_id, views, avg_time_watched_s, retention_rate, comments_count, shares_count, fetched_at'
        )
        .eq('inventory_vehicle_id', vehicleId),
      db.from('interested_cars').select('id', { count: 'exact', head: true }).eq('vehicle_uid', vehicleId),
      db
        .from('interested_cars')
        .select('id', { count: 'exact', head: true })
        .eq('vehicle_uid', vehicleId)
        .gte('created_at', since.toISOString()),
      db.from('meta_campaign_metrics').select('spend, reach, impressions, clicks, cost_per_lead').eq('inventory_id', vehicleId),
    ])
      .then(([vRes, mRes, tRes, wRes, pRes]) => {
        if (vRes.error) throw vRes.error
        if (mRes.error) throw mRes.error
        setVehicle(vRes.data ?? null)
        setMetaRows((mRes.data ?? []) as MetaMetricsRow[])
        setLeadsTotal(typeof tRes.count === 'number' ? tRes.count : null)
        setLeadsWindow(typeof wRes.count === 'number' ? wRes.count : 0)

        if (pRes.error) {
          setPaid(null)
        } else if (Array.isArray(pRes.data) && pRes.data.length) {
          const rows = pRes.data as Array<{ spend?: number; reach?: number; clicks?: number; cost_per_lead?: number | null }>
          const spend = rows.reduce((a, r) => a + (Number(r.spend) || 0), 0)
          const reach = rows.reduce((a, r) => a + (Number(r.reach) || 0), 0)
          const clicks = rows.reduce((a, r) => a + (Number(r.clicks) || 0), 0)
          const cpls = rows.map((r) => r.cost_per_lead).filter((x): x is number => typeof x === 'number' && !Number.isNaN(x))
          const cplAvg = cpls.length ? cpls.reduce((a, b) => a + b, 0) / cpls.length : null
          setPaid({ spend, reach, clicks, cpl: cplAvg })
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
    return { views, comments, shares, avgRetention, score }
  }, [metaRows])

  const category = useMemo(() => {
    const created = vehicle?.created_at ? new Date(vehicle.created_at).getTime() : Date.now()
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

  const label = vehicle ? [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ') : vehicleId

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/marketing/metricas/inventario"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-extrabold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <span className="text-xs font-bold text-gray-500">Ventana: {range} días</span>
      </div>

      {loading && (
        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando detalle…
        </div>
      )}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>}

      {!loading && !vehicle && !error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">No se encontró el vehículo.</div>
      )}

      {vehicle && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{label}</h2>
                <p className="text-sm text-gray-500 mt-1">ID inventario · {vehicleId}</p>
                <div className="mt-3">
                  <CategoryChip category={category} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500 font-semibold">Estado</dt>
                  <dd className="font-extrabold text-gray-900">{vehicle.status ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold">Leads totales</dt>
                  <dd className="font-extrabold text-gray-900">{leadsTotal == null ? '—' : leadsTotal.toLocaleString('es-EC')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold">Leads en ventana</dt>
                  <dd className="font-extrabold text-gray-900">{leadsWindow.toLocaleString('es-EC')}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Orgánico (videos)</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Views</dt>
                  <dd className="font-extrabold">{aggregates.views.toLocaleString('es-EC')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Retención prom.</dt>
                  <dd className="font-extrabold">{aggregates.avgRetention == null ? '—' : `${Math.round(aggregates.avgRetention)}%`}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Comentarios</dt>
                  <dd className="font-extrabold">{aggregates.comments.toLocaleString('es-EC')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Shares</dt>
                  <dd className="font-extrabold">{aggregates.shares.toLocaleString('es-EC')}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Pagado (Meta)</p>
              {paid ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Spend</dt>
                    <dd className="font-extrabold">{paid.spend.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Reach</dt>
                    <dd className="font-extrabold">{paid.reach.toLocaleString('es-EC')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Clicks</dt>
                    <dd className="font-extrabold">{paid.clicks.toLocaleString('es-EC')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">CPL (prom.)</dt>
                    <dd className="font-extrabold">
                      {paid.cpl == null ? '—' : paid.cpl.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  Sin filas en `meta_campaign_metrics` para este inventario (o tabla/columna distinta en BD).
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500">Score de efectividad (0–100)</p>
            <p className="mt-2 text-4xl font-extrabold text-gray-900">{aggregates.score == null ? '—' : aggregates.score}</p>
            <p className="mt-4 text-sm text-gray-700 leading-relaxed">
              <span className="font-extrabold text-gray-900">Recomendación: </span>
              {recommendation}
            </p>
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
        <div className="inline-flex items-center gap-2 text-sm text-gray-600 py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      }
    >
      <InventarioDetalleInner />
    </Suspense>
  )
}
