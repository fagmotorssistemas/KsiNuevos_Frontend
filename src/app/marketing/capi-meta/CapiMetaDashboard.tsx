'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'

import {
  formatCapiEcDate,
  formatCapiErrorDetail,
} from '@/lib/capi/format-capi-log'
import type { CapiEventLogRow, CapiHealthPayload } from '@/lib/capi/types'

type StatusFilter = 'all' | 'sent' | 'failed'

const PAGE_SIZE = 25

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'sent', label: 'Enviados' },
  { id: 'failed', label: 'Fallidos' },
]

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'success' | 'danger' | 'warning'
}) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-slate-900',
    success: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50/60 text-rose-900',
    warning: 'border-amber-200 bg-amber-50/60 text-amber-900',
  }

  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const sent = status === 'sent'
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase',
        sent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
      ].join(' ')}
    >
      {sent ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Enviado
        </>
      ) : (
        <>
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          Fallido
        </>
      )}
    </span>
  )
}

export function CapiMetaDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CapiHealthPayload | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/marketing/capi/health', { cache: 'no-store' })
      const json = (await res.json()) as CapiHealthPayload | { ok: false; message?: string }
      if (!res.ok || !('ok' in json) || json.ok !== true) {
        throw new Error(
          'message' in json && json.message ? json.message : 'Error al cargar eventos CAPI'
        )
      }
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la bitácora CAPI')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filter])

  const filteredEvents = useMemo(() => {
    const events = data?.events ?? []
    if (filter === 'all') return events
    return events.filter((e) => e.status === filter)
  }, [data?.events, filter])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const pageEvents = filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = data?.summary
  const errorTone =
    summary && summary.error_rate_pct > 5
      ? 'danger'
      : summary && summary.total > 0
        ? 'success'
        : 'neutral'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm font-medium">Cargando eventos CAPI Meta…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <p className="mt-3 text-sm font-semibold text-rose-900">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">CAPI Meta — Bitácora de eventos</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Conversiones enviadas a Meta (últimas {summary?.window_hours ?? 24}h). Evidencia de
            atribución de campañas Click-to-WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label={`Total eventos (${summary.window_hours}h)`}
            value={summary.total}
          />
          <SummaryCard label="Enviados" value={summary.sent} tone="success" />
          <SummaryCard label="Fallidos" value={summary.failed} tone="danger" />
          <SummaryCard
            label="% Error"
            value={`${summary.error_rate_pct}%`}
            tone={errorTone === 'danger' ? 'danger' : errorTone === 'success' ? 'success' : 'neutral'}
          />
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={[
                  'rounded-lg px-4 py-2 text-xs font-extrabold transition-colors',
                  filter === opt.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-slate-500">
            {filteredEvents.length} registro{filteredEvents.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {['Teléfono', 'Fecha', 'Evento', 'Estado', 'Detalle'].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                    No hay eventos en este filtro para las últimas {summary?.window_hours ?? 24}{' '}
                    horas.
                  </td>
                </tr>
              ) : (
                pageEvents.map((row) => (
                  <CapiEventRow key={row.id} row={row} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredEvents.length > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              Anterior
            </button>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CapiEventRow({ row }: { row: CapiEventLogRow }) {
  const detail =
    row.status === 'failed'
      ? formatCapiErrorDetail(row.error_message)
      : row.ctwa_clid
        ? `ctwa: ${row.ctwa_clid.slice(0, 12)}…`
        : '—'

  return (
    <tr className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors">
      <td className="px-5 py-3.5 text-sm font-bold text-slate-900 tabular-nums">
        {row.phone}
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
        {formatCapiEcDate(row.created_at)}
      </td>
      <td className="px-5 py-3.5 text-sm font-semibold text-violet-700">{row.event_name}</td>
      <td className="px-5 py-3.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-xs truncate" title={detail}>
        {detail}
      </td>
    </tr>
  )
}
