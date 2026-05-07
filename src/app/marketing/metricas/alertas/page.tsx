'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'

function levelRank(level: string | null | undefined) {
  const u = String(level ?? '').toUpperCase()
  if (u === 'ROJO' || u === 'RED' || u === 'CRITICAL' || u === 'CRÍTICO') return 0
  if (u === 'AMARILLO' || u === 'YELLOW' || u === 'WARN' || u === 'ADVERTENCIA') return 1
  return 2
}

function levelUi(level: string | null | undefined) {
  const r = levelRank(level)
  if (r === 0) return { icon: '🔴', label: 'Crítica', bar: 'border-red-200 bg-red-50' }
  if (r === 1) return { icon: '🟡', label: 'Advertencia', bar: 'border-amber-200 bg-amber-50' }
  return { icon: '🔵', label: 'Informativa', bar: 'border-sky-200 bg-sky-50' }
}

export default function MetricasAlertasPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const db = metricsDb(supabase)
      setLoading(true)
      setError(null)
      try {
        const { data, error: e } = await db.from('metrics_alerts').select('*').limit(200)
        if (cancelled) return
        if (e) throw e
        const list = [...(data ?? [])].sort((a, b) => levelRank(a.level) - levelRank(b.level))
        setRows(list)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(String(err instanceof Error ? err.message : err))
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const counts = useMemo(() => {
    let rojo = 0
    let amarillo = 0
    let azul = 0
    for (const r of rows) {
      const k = levelRank(r.level)
      if (k === 0) rojo++
      else if (k === 1) amarillo++
      else azul++
    }
    return { rojo, amarillo, azul }
  }, [rows])

  async function refreshCampaigns() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/marketing/metrics/campaigns-refresh', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j.message ?? 'No se pudo refrescar campañas')
        return
      }
      toast.success('Campañas: solicitud enviada al backend interno.')
    } catch (e: any) {
      toast.error(String(e?.message ?? e))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-sm">
          <span className="font-extrabold text-gray-900">🔴 {counts.rojo} críticas</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-extrabold text-gray-800">🟡 {counts.amarillo} advertencias</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-extrabold text-gray-700">🔵 {counts.azul} info</span>
        </div>
        <button
          type="button"
          onClick={refreshCampaigns}
          disabled={refreshing}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar campañas
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 font-semibold">
          {error}{' '}
          <span className="block mt-2 text-xs font-normal text-amber-800">
            Si aún no existe la vista/tabla `metrics_alerts` en Supabase, esta pantalla quedará vacía hasta que el backend la exponga con RLS.
          </span>
        </div>
      )}

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando alertas…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a, idx) => {
            const ui = levelUi(a.level)
            const vid = a.vehicle_id ?? a.inventory_id ?? a.inventory_vehicle_id
            const ts = a.created_at ?? a.timestamp ?? a.updated_at
            const tsFmt =
              ts && !Number.isNaN(new Date(ts).getTime())
                ? new Date(ts).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
                : null
            return (
              <div key={a.id ?? idx} className={`rounded-2xl border p-5 shadow-sm ${ui.bar}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-600">
                      {ui.icon} {ui.label}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-gray-900">{a.message ?? a.title ?? a.descripcion ?? 'Alerta'}</p>
                    {tsFmt && <p className="mt-2 text-xs text-gray-500">{tsFmt}</p>}
                  </div>
                  {vid && (
                    <Link
                      href={`/marketing/metricas/inventario/${vid}`}
                      className="shrink-0 inline-flex rounded-xl border border-gray-900/10 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-50"
                    >
                      Ver auto
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-600">
              No hay alertas registradas.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
