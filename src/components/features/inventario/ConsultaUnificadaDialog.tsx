'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Search, Sparkles, UserSearch, X } from 'lucide-react'
import { toast } from 'sonner'
import type { UnifiedConsultaResult, UnifiedReadableReport } from '@/lib/inventario/consultaUnificada.types'
import { SatjeOwnerConsulta } from '@/components/features/inventario/SatjeOwnerConsulta'
import {
  readConsultaDialogSession,
  readSatjeOwnerSession,
  writeConsultaDialogSession,
} from '@/lib/inventario/consultaDialogSession'

const LAST_CONSULTA_KEY = 'ksi.consultaUnificada.last'

function readLastConsulta(): { query: string; result: UnifiedConsultaResult | null } {
  if (typeof window === 'undefined') return { query: '', result: null }
  try {
    const raw = sessionStorage.getItem(LAST_CONSULTA_KEY)
    if (!raw) return { query: '', result: null }
    const parsed = JSON.parse(raw) as { query?: string; result?: UnifiedConsultaResult | null }
    if (typeof parsed.query === 'string') {
      return { query: parsed.query, result: parsed.result ?? null }
    }
  } catch {
    /* ignore */
  }
  return { query: '', result: null }
}

function saveLastConsulta(query: string, result: UnifiedConsultaResult) {
  try {
    sessionStorage.setItem(LAST_CONSULTA_KEY, JSON.stringify({ query, result }))
  } catch {
    /* ignore */
  }
}

function Dl({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return null
  return (
    <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`}>
          <dt className="text-[11px] font-semibold text-slate-500">{item.label}</dt>
          <dd className="text-sm text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ReportView({ report }: { report: UnifiedReadableReport }) {
  const otherAlerts = report.manualReview
    ? report.alerts.filter((alert) => !alert.startsWith('Advertencia:'))
    : report.alerts

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>

      {report.manualReview?.required ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900 inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {report.manualReview.title}
          </p>
          <p className="mt-2 text-sm text-amber-950 leading-relaxed">
            Las fuentes no coinciden en el dueño. Verificar el nombre del titular del vehículo.
          </p>
        </section>
      ) : null}

      {otherAlerts.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Alertas</p>
          <ul className="mt-2 space-y-1.5">
            {otherAlerts.map((alert) => (
              <li key={alert} className="flex items-start gap-2 text-sm text-amber-950">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {alert}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.ai?.conclusions.length ? (
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-900 inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Conclusiones IA
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-800">
            {report.ai.conclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.ai?.error ? (
        <p className="text-sm text-amber-800">El análisis IA no se pudo generar: {report.ai.error}</p>
      ) : null}

      {report.vehicle.length > 0 ? (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">Datos del vehículo</h4>
        <Dl items={report.vehicle} />
      </section>
      ) : null}

      {report.kind !== 'nombre' && report.kind !== 'cedula' && report.kind !== 'ruc' && (report.owners.ecuador || report.owners.consultas) ? (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">Propietario</h4>
        {report.owners.conflict ? (
          <div className="mt-2 space-y-3 text-sm text-slate-800 leading-relaxed">
            <p>Las fuentes consultadas no coinciden en el titular actual.</p>
            {report.owners.ecuador ? (
              <p>
                EcuadorAPI identifica a <span className="font-semibold">{report.owners.ecuador.name}</span>
                {report.owners.ecuador.cedula ? `, cédula ${report.owners.ecuador.cedula}` : ''}.
              </p>
            ) : null}
            {report.owners.consultas ? (
              <p>
                Consultas.ec muestra a <span className="font-semibold">{report.owners.consultas.name}</span>
                {report.owners.consultas.cedula ? `, cédula ${report.owners.consultas.cedula}` : ''}.
              </p>
            ) : null}
            {report.owners.note ? <p className="font-semibold text-amber-900">{report.owners.note}</p> : null}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-800">
            <p className="font-semibold">{report.owners.ecuador?.name || report.owners.consultas?.name || '—'}</p>
            {(report.owners.ecuador?.cedula || report.owners.consultas?.cedula) ? (
              <p className="text-slate-600 mt-1">
                Cédula: {report.owners.ecuador?.cedula || report.owners.consultas?.cedula}
              </p>
            ) : null}
          </div>
        )}
      </section>
      ) : null}

      {report.vehicle.length > 0 || report.pendingCitations.length > 0 ? (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">
          {report.vehicle.length > 0 ? 'Deudas y multas del vehículo' : 'Multas de tránsito'}
        </h4>
        <p className="mt-2 text-sm text-slate-800 leading-relaxed">
          {report.vehicle.length > 0 ? (
            <>
              Deuda pendiente con el SRI: {report.debts.sri}. Multas de tránsito pendientes:{' '}
              {report.debts.pendingFinesCount}. Valor pendiente: {report.debts.pendingAmount}.
            </>
          ) : (
            <>
              Multas de tránsito pendientes: {report.debts.pendingFinesCount}. Valor pendiente:{' '}
              {report.debts.pendingAmount}.
            </>
          )}
        </p>
        {report.pendingCitations.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {report.pendingCitations.map((row) => (
              <li key={row.number} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-slate-800">
                <p>
                  <span className="font-semibold">Citación {row.number}</span>
                  {row.date ? ` · ${row.date}` : ''}
                </p>
                <p className="mt-1">{row.entity}</p>
                <p className="mt-1">{row.motive}</p>
                <p className="mt-1">
                  {row.amount ? `Valor pendiente: ${row.amount}. ` : ''}
                  {row.points ? `Puntos: ${row.points}. ` : ''}
                  Estado: {row.status}.
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      ) : null}

      {report.infractionHistory.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-bold text-slate-900">Historial de citaciones</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-800">
            {report.infractionHistory.map((row) => (
              <li key={row.label}>
                {row.label}
                {row.years.length ? `, registrado en ${row.years.join(', ')}` : ''}.
                {row.statuses.length ? ` Estado: ${row.statuses.join(', ')}.` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.person.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-bold text-slate-900">Información de la persona consultada</h4>
          <Dl items={report.person} />
          {report.activity ? (
            <p className="mt-3 text-sm text-slate-800 leading-relaxed">
              <span className="font-semibold">Actividad económica: </span>
              {report.activity}
            </p>
          ) : null}
        </section>
      ) : null}

      {report.judicial.consulted !== false ? (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">Procesos judiciales</h4>
        <p className="mt-2 text-sm text-slate-800 leading-relaxed">
          {report.judicial.total === 0
            ? 'No se encontraron procesos en Función Judicial.'
            : `La Función Judicial registra ${report.judicial.total} proceso${report.judicial.total === 1 ? '' : 's'}${
                report.judicial.transit
                  ? `, de los cuales ${report.judicial.transit} se relacionan con materia de tránsito`
                  : ''
              }${report.judicial.years ? ` (${report.judicial.years})` : ''}.`}
        </p>
        {report.judicial.other.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-800">
            {report.judicial.other.map((row, index) => (
              <li key={`${row.id}-${row.role}-${index}`}>
                {row.plainAction || row.action || 'Proceso'}
                {row.date ? ` (${row.date})` : ''}
                {row.role ? `, con rol de ${row.role.toLowerCase()}` : ''}.
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">{report.judicial.roleNote}</p>
      </section>
      ) : null}

      {report.ai?.investigationSummary ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-900">Resumen de la investigación</h4>
          {report.ai.investigationSummary.split(/\n+/).map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-2 text-sm text-slate-800 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      {report.kind !== 'nombre' && report.kind !== 'cedula' && report.kind !== 'ruc' && report.ksi.length > 0 ? (
        <p className="text-xs text-slate-500">
          En inventario KSI:{' '}
          {report.ksi.map((row) => `${row.placa} · ${row.brand} ${row.model}`).join('; ')}
        </p>
      ) : null}
    </div>
  )
}

export function ConsultaUnificadaDialog({ onClose }: { onClose: () => void }) {
  const last = readLastConsulta()
  const dialogSession = readConsultaDialogSession()
  const satjeSession = readSatjeOwnerSession()
  const [query, setQuery] = useState(last.query)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UnifiedConsultaResult | null>(last.result)
  const [panel, setPanel] = useState<'unificada' | 'propietario'>(
    satjeSession?.consultaId ? 'propietario' : dialogSession.panel
  )

  const run = async () => {
    const value = query.trim()
    if (!value) {
      toast.error('Escribe una placa, cédula, RUC o nombre')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/inventario/consulta-unificada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value }),
      })
      const body = (await res.json()) as { data?: UnifiedConsultaResult; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error || 'No se pudo consultar')
      setResult(body.data)
      saveLastConsulta(value, body.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo consultar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    writeConsultaDialogSession({ open: true, panel })
  }, [panel])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col ${result || loading || panel === 'propietario' ? 'max-w-3xl max-h-[92vh]' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {panel === 'propietario' ? 'Consultar a propietario' : 'Consulta unificada'}
            </h2>
            {panel === 'propietario' ? (
              <p className="text-xs text-slate-500 mt-1">SATJE · demandado / procesado</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {panel === 'unificada' ? (
              <button
                type="button"
                onClick={() => setPanel('propietario')}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <UserSearch className="h-3.5 w-3.5" />
                Consultar a propietario
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPanel('unificada')}
                className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={panel === 'propietario' ? 'overflow-y-auto flex-1 min-h-0' : 'hidden'}>
          <SatjeOwnerConsulta />
        </div>

        {panel === 'unificada' ? (
          <>
            <form
              className="shrink-0 flex flex-col sm:flex-row gap-2 p-4 border-b border-slate-100"
              onSubmit={(event) => {
                event.preventDefault()
                void run()
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value
                    setQuery(/\s/.test(value) ? value : value.toUpperCase())
                  }}
                  placeholder="Placa, número de cédula o RUC"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? 'Consultando y analizando…' : 'Consultar'}
              </button>
            </form>

            {loading || result ? (
              <div className="overflow-y-auto flex-1 min-h-0 p-4">
                {loading ? (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Consultando fuentes y armando el informe…
                  </p>
                ) : null}
                {result?.report ? <ReportView report={result.report} /> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
