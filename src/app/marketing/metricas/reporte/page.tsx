'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { formatReportDateLabel } from '@/app/marketing/metricas/lib/daily-metrics-report'
import { metricsDb } from '@/app/marketing/metricas/lib/db'
import { parseDailyReportSections } from '@/app/marketing/metricas/lib/report-sections'
import {
  ParagraphBlock,
  parseRecommendationsList,
  RecommendationsBlock,
} from '@/app/marketing/metricas/lib/ui-blocks'

type TabKey = 'resumen' | 'guiones' | 'marca' | 'reco'

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'resumen', label: 'Resumen', icon: '📋' },
  { key: 'guiones', label: 'Guiones', icon: '🎬' },
  { key: 'marca', label: 'Por marca', icon: '🚗' },
  { key: 'reco', label: 'Recomendaciones', icon: '✅' },
]

function reportDateKey(raw: string) {
  return String(raw).slice(0, 10)
}

function dateStripLabel(ymd: string) {
  const key = reportDateKey(ymd)
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return { day: '—', weekday: '', month: '' }
  const noon = Date.UTC(y, m - 1, d, 12, 0, 0)
  const weekday = new Intl.DateTimeFormat('es-EC', {
    weekday: 'short',
    timeZone: 'America/Guayaquil',
  })
    .format(new Date(noon))
    .replace('.', '')
  const month = new Intl.DateTimeFormat('es-EC', {
    month: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(noon))
  return { day: String(d), weekday, month }
}

function monthLabelFromYmd(ymd: string) {
  const key = reportDateKey(ymd)
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return ''
  const noon = Date.UTC(y, m - 1, 1, 12, 0, 0)
  const raw = new Intl.DateTimeFormat('es-EC', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(noon))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function MetricasReportePage() {
  const { supabase } = useAuth()
  const dateScrollRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [tab, setTab] = useState<TabKey>('resumen')
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const db = metricsDb(supabase)
    setLoading(true)
    setError(null)
    db
      .from('daily_metrics_report')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(14)
      .then(({ data, error: e }: { data: any[] | null; error: { message: string } | null }) => {
        if (e) {
          setError(e.message)
          setRows([])
          return
        }
        const list = data ?? []
        setRows(list)
        const first = list[0]?.report_date
        if (first) setSelectedDate(reportDateKey(String(first)))
      })
      .finally(() => setLoading(false))
  }, [supabase])

  const selectedRow = useMemo(() => {
    return rows.find((r) => reportDateKey(String(r.report_date)) === selectedDate) ?? null
  }, [rows, selectedDate])

  const sections = useMemo(() => parseDailyReportSections(selectedRow as any), [selectedRow])

  const datos = sections.datos as Record<string, unknown> | null | undefined
  const leadsTotal = typeof datos?.leads_total === 'number' ? datos.leads_total : null
  const spendTotal = typeof datos?.spend_total === 'number' ? datos.spend_total : null
  const mejorTipo = datos?.mejor_tipo_guion != null ? String(datos.mejor_tipo_guion) : null
  const peorTipo = datos?.peor_tipo_guion != null ? String(datos.peor_tipo_guion) : null
  const mejorMarca = datos?.mejor_marca != null ? String(datos.mejor_marca) : null
  const cplRaw = datos?.costo_por_lead
  const cplNum = cplRaw != null ? Number(cplRaw) : NaN
  const cplOk = Number.isFinite(cplNum) ? cplNum : null
  const lv = datos?.leads_vs_ayer
  const leadsVsAyer = lv == null || Number.isNaN(Number(lv)) ? null : Number(lv)

  const monthBanner = selectedDate ? monthLabelFromYmd(selectedDate) : ''

  async function generateNow() {
    setGenLoading(true)
    try {
      const res = await fetch('/api/marketing/metrics/report-generate', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j.message ?? 'No se pudo generar el reporte')
        return
      }
      toast.success('Reporte solicitado. Actualizando…')
      const db = metricsDb(supabase!)
      const { data } = await db
        .from('daily_metrics_report')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(14)
      setRows(data ?? [])
      const first = data?.[0]?.report_date
      if (first) setSelectedDate(reportDateKey(String(first)))
    } catch (e: unknown) {
      toast.error(String(e instanceof Error ? e.message : e))
    } finally {
      setGenLoading(false)
    }
  }

  function scrollDates(dir: -1 | 1) {
    dateScrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  const tabContent = useMemo(() => {
    switch (tab) {
      case 'resumen':
        return sections.resumen ? (
          <ParagraphBlock text={sections.resumen} />
        ) : (
          <p className="text-sm text-slate-500">Sin resumen para esta fecha.</p>
        )
      case 'guiones':
        return sections.guiones ? (
          <ParagraphBlock text={sections.guiones} />
        ) : (
          <p className="text-sm text-slate-500">Sin análisis de guiones para esta fecha.</p>
        )
      case 'marca':
        return sections.marca ? (
          <ParagraphBlock text={sections.marca} />
        ) : (
          <p className="text-sm text-slate-500">Sin análisis por marca para esta fecha.</p>
        )
      case 'reco':
        return <RecommendationsBlock value={sections.recomendaciones} />
    }
  }, [tab, sections])

  const activeTabMeta = TABS.find((t) => t.key === tab)!

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
            Inteligencia diaria
          </p>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {selectedDate ? formatReportDateLabel(selectedDate) : 'Selecciona un día'}
          </p>
        </div>
        <button
          type="button"
          onClick={generateNow}
          disabled={genLoading || !supabase}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 transition"
        >
          {genLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2 text-amber-300" />
          )}
          Generar reporte
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm text-slate-600 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando reportes…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center">
          <p className="text-sm font-extrabold text-slate-800">Aún no hay reportes guardados</p>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Pulsa <span className="font-bold">Generar reporte</span> para crear el primero con el backend de
            automatización.
          </p>
        </div>
      ) : (
        <>
          {/* Selector de fechas horizontal */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-extrabold text-slate-700">Últimos {rows.length} días</p>
              {monthBanner && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">{monthBanner}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollDates(-1)}
                className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Fechas anteriores"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div
                ref={dateScrollRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin flex-1 snap-x snap-mandatory"
              >
                {rows.map((r) => {
                  const key = reportDateKey(String(r.report_date))
                  const active = key === selectedDate
                  const { day, weekday } = dateStripLabel(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={[
                        'snap-start shrink-0 min-w-[4.25rem] rounded-2xl px-3 py-3 text-center transition-all',
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'block text-2xl font-extrabold tabular-nums leading-none',
                          active ? 'text-white' : 'text-slate-900',
                        ].join(' ')}
                      >
                        {day}
                      </span>
                      <span
                        className={[
                          'block mt-1 text-[10px] font-extrabold uppercase tracking-wide',
                          active ? 'text-indigo-100' : 'text-slate-500',
                        ].join(' ')}
                      >
                        {weekday}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollDates(1)}
                className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Fechas siguientes"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Contenido principal */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/60">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={[
                      'flex-1 min-w-[7rem] rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all',
                      tab === t.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900',
                    ].join(' ')}
                  >
                    <span className="mr-1.5">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <article className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <header className="px-5 sm:px-6 py-3.5 border-b border-slate-100">
                  <h2 className="text-sm font-extrabold text-slate-900">{activeTabMeta.label}</h2>
                  {tab === 'reco' && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {parseRecommendationsList(sections.recomendaciones).length} sugerencias para el
                      equipo
                    </p>
                  )}
                </header>
                <div className="p-5 sm:p-6 text-slate-700">{tabContent}</div>
              </article>
            </div>

            {/* Panel lateral */}
            <aside className="w-full xl:w-[300px] shrink-0 space-y-4">
              <div className="rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 p-5 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                  Destacados del día
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium tabular-nums">{selectedDate}</p>

                <ul className="mt-5 space-y-4">
                  <li className="flex justify-between gap-2 text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-semibold">Leads</span>
                    <span className="font-extrabold text-slate-900 text-right">
                      {leadsTotal == null ? '—' : leadsTotal.toLocaleString('es-EC')}
                      {leadsVsAyer != null && (
                        <span className="block text-[11px] font-semibold text-slate-500">
                          {leadsVsAyer >= 0 ? '↑' : '↓'}{' '}
                          {Math.abs(leadsVsAyer).toLocaleString('es-EC', { maximumFractionDigits: 2 })} vs
                          ayer
                        </span>
                      )}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2 text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-semibold">Inversión</span>
                    <span className="font-extrabold text-slate-900">
                      {spendTotal == null
                        ? '—'
                        : spendTotal.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2 text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-semibold">Costo por lead</span>
                    <span className="font-extrabold text-slate-900">
                      {cplOk == null
                        ? '—'
                        : cplOk.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                    </span>
                  </li>
                  <li className="flex gap-3 pt-1">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Clapperboard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Mejor tipo guion</p>
                      <p className="text-sm font-extrabold text-slate-900 capitalize truncate">
                        {mejorTipo ?? '—'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                      <Clapperboard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Peor tipo guion</p>
                      <p className="text-sm font-extrabold text-slate-900 capitalize truncate">
                        {peorTipo ?? '—'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Mejor marca</p>
                      <p className="text-sm font-extrabold text-slate-900 capitalize truncate">
                        {mejorMarca ?? '—'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

            </aside>
          </div>
        </>
      )}
    </div>
  )
}
