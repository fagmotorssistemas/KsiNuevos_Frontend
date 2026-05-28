'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { fetchMetricsAlerts } from '@/app/marketing/metricas/lib/meta-ad-alerts-db'
import { formatMetaResponse, pauseItems, type RecentAdPauseGroup } from '@/app/marketing/metricas/lib/meta-ad-alerts'

function formatEcDate(ts: string | null | undefined) {
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
}

function RecentPauseCard({ group }: { group: RecentAdPauseGroup }) {
  const items = pauseItems(group)
  const confirmed = group.all_confirmed === true
  const label = group.vehicle_label?.trim() || 'Vehículo'
  const when = formatEcDate(group.paused_at ?? items[0]?.paused_at)
  const by = group.paused_by ?? items[0]?.paused_by

  return (
    <article
      className={[
        'rounded-3xl border shadow-sm overflow-hidden',
        confirmed
          ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30'
          : 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-red-50/20',
      ].join(' ')}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <div
              className={[
                'shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm',
                confirmed ? 'bg-emerald-600' : 'bg-rose-600',
              ].join(' ')}
            >
              {confirmed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p
                className={[
                  'text-[10px] font-extrabold uppercase tracking-wider',
                  confirmed ? 'text-emerald-800' : 'text-rose-800',
                ].join(' ')}
              >
                {confirmed ? 'Pausa confirmada en Meta' : 'Pausa pendiente o con error'}
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 break-words">{label}</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {when && <span>{when}</span>}
                {by && (
                  <span>
                    {when ? ' · ' : ''}
                    Por: <span className="font-bold text-slate-700">{by}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          {group.inventory_id && (
            <Link
              href={`/marketing/metricas/inventario/${group.inventory_id}`}
              className="shrink-0 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
            >
              Ver auto
            </Link>
          )}
        </div>

        <ul className="mt-4 space-y-2">
          {items.length === 0 ? (
            <li className="text-sm text-slate-500">Sin detalle por anuncio.</li>
          ) : (
            items.map((ad) => {
              const ok = ad.meta_confirmed === true
              const err = formatMetaResponse(ad.meta_response)
              return (
                <li
                  key={ad.ad_id}
                  className="rounded-2xl border border-white/90 bg-white/95 px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {ad.ad_name?.trim() || ad.ad_id}
                      </p>
                      {ad.campaign_name && (
                        <p className="text-xs text-slate-500 mt-0.5">{ad.campaign_name}</p>
                      )}
                    </div>
                    <span
                      className={[
                        'inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg',
                        ok ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100',
                      ].join(' ')}
                    >
                      {ok ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" /> Revisar
                        </>
                      )}
                    </span>
                  </div>
                  {!ok && err && (
                    <pre className="mt-2 text-[11px] leading-relaxed text-rose-900 bg-rose-50/80 border border-rose-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                      {err}
                    </pre>
                  )}
                </li>
              )
            })
          )}
        </ul>
      </div>
    </article>
  )
}

export function MetaAdAlertsSections() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentPauses, setRecentPauses] = useState<RecentAdPauseGroup[]>([])

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const raw = await fetchMetricsAlerts(supabase)
      setRecentPauses(raw.recent_ad_pauses ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el historial')
      setRecentPauses([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  if (!supabase || loading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-600 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando historial de pausas…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-950">
        <p className="font-extrabold">No se pudo leer el historial</p>
        <p className="mt-2 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center rounded-xl bg-rose-900 px-3 py-2 text-xs font-extrabold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Reintentar
        </button>
      </div>
    )
  }

  const unconfirmed = recentPauses.filter((g) => g.all_confirmed !== true)
  const confirmed = recentPauses.filter((g) => g.all_confirmed === true)

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 p-5 sm:p-6 shadow-sm">
        <div className="flex gap-3">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">Pausa automática en el servidor</p>
            <p className="mt-1 text-sm text-slate-600 font-medium leading-relaxed">
              El cron en <span className="font-bold">auto.ksinuevos.com</span> detecta autos vendidos con
              anuncios ACTIVE en Meta y los pausa solo. Esta pantalla es solo lectura: muestra lo registrado en{' '}
              <code className="font-mono text-xs">meta_ad_pause_log</code>.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Historial de pausas (últimas 72 h)</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Pausas hechas por el sistema (<code className="font-mono text-xs">system-auto</code>) o el backend.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 w-fit"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Actualizar
          </button>
        </div>

        {recentPauses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="mt-3 text-sm font-extrabold text-slate-800">Sin pausas registradas en 72 h</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Si Meta Ads Manager pausó manualmente, no aparece aquí. Solo entradas del bot en el servidor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unconfirmed.length > 0 && (
              <>
                {unconfirmed.map((g) => (
                  <RecentPauseCard key={`u-${g.inventory_id}-${g.paused_at ?? ''}`} group={g} />
                ))}
              </>
            )}
            {confirmed.map((g) => (
              <RecentPauseCard key={`c-${g.inventory_id}-${g.paused_at ?? ''}`} group={g} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
