'use client'



import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import {

  Car,

  ClipboardList,

  Loader2,

  Sparkles,

  Video,

} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

import {

  fetchCampaignMonthOptions,

  fetchDashboardMetrics,

  getCurrentCampaignMonthYmd,

  type DashboardMetrics,

  type MetricasCampaignMonth,

} from '@/app/marketing/metricas/lib/dashboard-metrics'

import {

  CampaignMonthPicker,

  fmtInt,

  fmtPct,

  fmtUsd,

  KpiTile,

  MetricsChannelTabs,

  type MetricsChannelTab,

  OrganicCreativesList,
  OrganicMetricsTabsBar,
  OrganicVehicleRanking,
  type OrganicMetricsSubTab,
  type OrganicVehicleStatusTab,
  VehicleLeadsTable,

} from '@/app/marketing/metricas/lib/metricas-ui'

import { formatReportDateLabel } from '@/app/marketing/metricas/lib/daily-metrics-report'



export default function MarketingMetricasPage() {

  const { supabase } = useAuth()

  const [campaignMonth, setCampaignMonth] = useState<MetricasCampaignMonth>(getCurrentCampaignMonthYmd)

  const [monthOptions, setMonthOptions] = useState<MetricasCampaignMonth[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<DashboardMetrics | null>(null)

  const [channelTab, setChannelTab] = useState<MetricsChannelTab>('paid')
  const [organicSubTab, setOrganicSubTab] = useState<OrganicMetricsSubTab>('vehicles')
  const [organicVehicleStatus, setOrganicVehicleStatus] = useState<OrganicVehicleStatusTab>('available')

  const intervalRef = useRef<number | null>(null)



  useEffect(() => {
    if (!supabase) return
    fetchCampaignMonthOptions(supabase)
      .then((opts) => {
        setMonthOptions(opts.length > 0 ? opts : [getCurrentCampaignMonthYmd()])
      })
      .catch(() => setMonthOptions([getCurrentCampaignMonthYmd()]))
  }, [supabase])



  useEffect(() => {

    if (!supabase) return



    async function load() {

      setError(null)

      setLoading(true)

      try {

        const dash = await fetchDashboardMetrics(supabase, campaignMonth)
        setData(dash)
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : e instanceof Error
              ? e.message
              : String(e)
        setError(msg)

        setData(null)

      } finally {

        setLoading(false)

      }

    }



    load()

    if (intervalRef.current) window.clearInterval(intervalRef.current)

    intervalRef.current = window.setInterval(load, 5 * 60 * 1000)

    return () => {

      if (intervalRef.current) window.clearInterval(intervalRef.current)

    }

  }, [supabase, campaignMonth])



  const monthLabel = data?.monthLabel ?? campaignMonth



  const organicVehiclesAvailable = useMemo(
    () => data?.organic.vehicles.filter((v) => !v.isVendido) ?? [],
    [data]
  )
  const organicVehiclesSold = useMemo(
    () => data?.organic.vehicles.filter((v) => v.isVendido) ?? [],
    [data]
  )
  const organicVehiclesFiltered = useMemo(
    () => (organicVehicleStatus === 'sold' ? organicVehiclesSold : organicVehiclesAvailable),
    [organicVehicleStatus, organicVehiclesAvailable, organicVehiclesSold]
  )

  const maxVehicleViews = useMemo(
    () => Math.max(1, ...(organicVehiclesFiltered.map((v) => v.views) ?? [0])),
    [organicVehiclesFiltered]
  )

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resumen Operativo</h1>
          <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
            Mes de campaña: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{monthLabel}</span>
            {data && (
              <span className="text-slate-400 font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                {data.sinceReportDate} → {data.untilReportDate}
              </span>
            )}
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-medium text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Actualizando…
              </span>
            )}
          </p>
        </div>
        <CampaignMonthPicker
          value={campaignMonth}
          options={monthOptions}
          onChange={setCampaignMonth}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-red-600 font-bold">!</span>
          </div>
          {error}
        </div>
      )}

      {/* LECTURA DEL DÍA (IA) */}
      {data?.narrative.excerpt && (
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Sparkles className="w-24 h-24 text-indigo-600" />
          </div>
          <div className="px-6 py-5 border-b border-indigo-50/50 flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200/50">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 tracking-tight">Lectura del día (IA)</p>
                {data.narrative.reportDate && (
                  <p className="text-xs font-medium text-indigo-600/80 mt-0.5">
                    {formatReportDateLabel(data.narrative.reportDate)}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/marketing/metricas/reporte"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/60 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
            >
              <ClipboardList className="h-4 w-4" />
              Reporte completo
            </Link>
          </div>
          <div className="p-6 relative z-10">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">{data.narrative.excerpt}</p>
          </div>
        </div>
      )}



      <MetricsChannelTabs
        active={channelTab}
        onChange={setChannelTab}
        paid={
          <>
            {data?.paid.usedFallbackSnapshot && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4">
                Sin datos de Meta en este mes — se muestra el último día sincronizado.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
              <KpiTile
                label="Inversión total"
                value={fmtUsd(data?.paid.spendTotal)}
                hint={`Gasto total de campañas en Meta. ${fmtInt(data?.paid.generalCampaignsCount)} campañas · ${fmtInt(data?.paid.vehiclesWithAds)} autos con desglose.`}
                accent="violet"
              />
              <KpiTile
                label="Contactos (ads)"
                value={fmtInt(data?.paid.contactsFromAds)}
                hint="Contactos que Meta atribuye a tus anuncios (mensajes, WhatsApp, formularios)."
              />
              <KpiTile
                label="CPL real"
                value={fmtUsd(data?.paid.cplReal)}
                hint="Costo por contacto según Meta: inversión ÷ contactos (ads)."
                accent="emerald"
              />
              <KpiTile
                label="Alcance"
                value={fmtInt(data?.paid.reachTotal)}
                hint="Personas únicas que vieron tus anuncios al menos una vez."
              />
              <KpiTile
                label="Impresiones"
                value={fmtInt(data?.paid.impressionsTotal)}
                hint={
                  data?.paid.ctrPct != null
                    ? `Veces que se mostró el anuncio este mes. ${fmtPct(data.paid.ctrPct)} de quienes lo vieron hicieron clic.`
                    : 'Veces que se mostró el anuncio en campañas activas del mes.'
                }
              />
              <KpiTile
                label="Clics"
                value={fmtInt(data?.paid.clicksTotal)}
                hint="Clics en el enlace o botón de los anuncios."
              />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Car className="h-4 w-4 text-indigo-600" />
                  <p className="text-xs font-bold text-slate-600">
                    {fmtInt(data?.paid.byVehicle.length)} en campaña ·{' '}
                    {fmtInt(data?.paid.byVehicleNeutral.length)} neutros · {monthLabel}
                  </p>
                </div>
                <CampaignMonthPicker
                  value={campaignMonth}
                  options={monthOptions}
                  onChange={setCampaignMonth}
                />
              </div>
              <VehicleLeadsTable
                campaignRows={data?.paid.byVehicle ?? []}
                neutralRows={data?.paid.byVehicleNeutral ?? []}
              />
            </div>
          </>
        }
        organic={
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
              <KpiTile
                label="Views en el mes"
                value={fmtInt(data?.organic.viewsInMonth)}
                accent="emerald"
              />
              <KpiTile
                label="Videos activos"
                value={fmtInt(data?.organic.activeVideos)}
                hint="Vehículos y creativos con métricas"
              />
              <KpiTile
                label="Retención prom."
                value={
                  data?.organic.retentionAvgPct != null
                    ? `${Math.round(data.organic.retentionAvgPct)}%`
                    : '—'
                }
                hint={
                  data?.organic.retentionAvgPct == null
                    ? 'Sin retention_rate en filas recientes'
                    : undefined
                }
              />
              <KpiTile
                label="Mejor vehículo"
                value={data?.organic.bestVehicle ?? '—'}
                valueVariant="text"
                hint={
                  data?.organic.bestVehicle
                    ? `${fmtInt(data.organic.bestVehicleViews)} views acumuladas`
                    : undefined
                }
                accent="emerald"
              />
            </div>

            <OrganicMetricsTabsBar
              subTab={organicSubTab}
              onSubTabChange={setOrganicSubTab}
              vehicleCount={data?.organic.vehicles.length ?? 0}
              creativeCount={data?.organic.creatives.videoCount ?? 0}
              vehicleStatus={organicVehicleStatus}
              onVehicleStatusChange={setOrganicVehicleStatus}
              availableCount={organicVehiclesAvailable.length}
              soldCount={organicVehiclesSold.length}
            />

            {organicSubTab === 'vehicles' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-extrabold text-slate-900">
                    Views por vehículo · {organicVehicleStatus === 'sold' ? 'vendidos' : 'disponibles'}
                  </p>
                  {organicVehiclesFiltered[0] && (
                    <span className="text-xs text-slate-500 font-medium ml-auto">
                      Top: {organicVehiclesFiltered[0].vehicleLabel} ·{' '}
                      {fmtInt(organicVehiclesFiltered[0].views)} views
                    </span>
                  )}
                </div>
                <OrganicVehicleRanking
                  key={organicVehicleStatus}
                  vehicles={organicVehiclesFiltered}
                  maxValue={maxVehicleViews}
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <p className="text-sm font-extrabold text-slate-900">Creativos sin inventario</p>
                </div>
                <OrganicCreativesList group={data?.organic.creatives ?? { label: 'Creativos', views: 0, videoCount: 0, retentionAvgPct: null, posts: [] }} />
              </>
            )}
          </>
        }
      />

    </div>

  )

}
