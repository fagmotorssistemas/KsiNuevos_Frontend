'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { metricsDb } from '@/app/marketing/metricas/lib/db'
import { parseDailyReportSections } from '@/app/marketing/metricas/lib/report-sections'
import { ParagraphBlock, RecommendationsBlock, SectionCard } from '@/app/marketing/metricas/lib/ui-blocks'
import { formatReportDateLabel } from '@/app/marketing/metricas/lib/daily-metrics-report'

type TabKey = 'resumen' | 'guiones' | 'marca' | 'reco'

export default function MetricasReportePage() {
  const { supabase } = useAuth()
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
        if (first) setSelectedDate(String(first))
      })
      .finally(() => setLoading(false))
  }, [supabase])

  const selectedRow = useMemo(() => {
    return rows.find((r) => String(r.report_date) === selectedDate) ?? null
  }, [rows, selectedDate])

  const sections = useMemo(() => parseDailyReportSections(selectedRow as any), [selectedRow])

  const datos = sections.datos as Record<string, unknown> | null | undefined
  const leadsTotal = typeof datos?.leads_total === 'number' ? datos.leads_total : null
  const spendTotal = typeof datos?.spend_total === 'number' ? datos.spend_total : null
  const mejorTipo = datos?.mejor_tipo_guion != null ? String(datos.mejor_tipo_guion) : '—'
  const peorTipo = datos?.peor_tipo_guion != null ? String(datos.peor_tipo_guion) : '—'
  const mejorMarca = datos?.mejor_marca != null ? String(datos.mejor_marca) : '—'
  const cplRaw = datos?.costo_por_lead
  const cplNum = cplRaw != null ? Number(cplRaw) : NaN
  const cplOk = Number.isFinite(cplNum) ? cplNum : null
  const lv = datos?.leads_vs_ayer
  const leadsCmp =
    lv == null || Number.isNaN(Number(lv))
      ? 'Variación leads vs día anterior: —'
      : `${Number(lv) >= 0 ? '↑' : '↓'} ${Math.abs(Number(lv)).toLocaleString('es-EC', { maximumFractionDigits: 2 })} · leads_vs_ayer (BD)`

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
      const { data } = await db.from('daily_metrics_report').select('*').order('report_date', { ascending: false }).limit(14)
      setRows(data ?? [])
    } catch (e: any) {
      toast.error(String(e?.message ?? e))
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500">Fecha del reporte</p>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading || rows.length === 0}
                className="mt-2 w-full sm:w-auto min-w-[220px] px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 bg-white"
              >
                {rows.map((r) => (
                  <option key={String(r.report_date)} value={String(r.report_date)}>
                    {formatReportDateLabel(String(r.report_date))}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={generateNow}
              disabled={genLoading || !supabase}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generar reporte ahora
            </button>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>}

          {loading ? (
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando historial…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-600">
              No hay filas en <code className="font-mono text-xs">daily_metrics_report</code>. Usa “Generar reporte ahora” si el backend está
              configurado.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['resumen', '📋 Resumen ejecutivo'],
                    ['guiones', '🎬 Análisis de guiones'],
                    ['marca', '🚗 Análisis por marca'],
                    ['reco', '✅ Recomendaciones'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={[
                      'rounded-xl px-3 py-2 text-xs font-extrabold border transition',
                      tab === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'resumen' && (
                <SectionCard icon="📋" title="Resumen ejecutivo">
                  {sections.resumen ? (
                    <ParagraphBlock text={sections.resumen} />
                  ) : (
                    <p className="text-sm text-gray-500">Sin texto en esta sección para la fecha seleccionada.</p>
                  )}
                </SectionCard>
              )}
              {tab === 'guiones' && (
                <SectionCard icon="🎬" title="Análisis de guiones">
                  {sections.guiones ? (
                    <ParagraphBlock text={sections.guiones} />
                  ) : (
                    <p className="text-sm text-gray-500">Sin texto en esta sección para la fecha seleccionada.</p>
                  )}
                </SectionCard>
              )}
              {tab === 'marca' && (
                <SectionCard icon="🚗" title="Análisis por marca">
                  {sections.marca ? (
                    <ParagraphBlock text={sections.marca} />
                  ) : (
                    <p className="text-sm text-gray-500">Sin texto en esta sección para la fecha seleccionada.</p>
                  )}
                </SectionCard>
              )}
              {tab === 'reco' && (
                <SectionCard icon="✅" title="Recomendaciones">
                  <RecommendationsBlock value={sections.recomendaciones} />
                </SectionCard>
              )}
            </>
          )}
        </div>

        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500">report_date (BD)</p>
            <p className="text-sm font-extrabold text-gray-900 mt-1">{formatReportDateLabel(selectedDate)}</p>
            <p className="text-[11px] font-mono text-gray-500">{selectedDate ? String(selectedDate).slice(0, 10) : '—'}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Leads</dt>
                <dd className="font-extrabold text-gray-900">
                  {leadsTotal == null ? '—' : leadsTotal.toLocaleString('es-EC')}
                  <span className="block text-[11px] font-semibold text-gray-500">{leadsCmp}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Inversión</dt>
                <dd className="font-extrabold text-gray-900">
                  {spendTotal == null ? '—' : spendTotal.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Costo por lead</dt>
                <dd className="font-extrabold text-gray-900">
                  {cplOk == null ? '—' : cplOk.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Mejor tipo guion</dt>
                <dd className="font-extrabold text-gray-900 text-right">{mejorTipo}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Peor tipo guion</dt>
                <dd className="font-extrabold text-gray-900 text-right">{peorTipo}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 font-semibold">Mejor marca</dt>
                <dd className="font-extrabold text-gray-900 text-right">{mejorMarca}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
