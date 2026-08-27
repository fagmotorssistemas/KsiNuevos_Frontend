'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, Scale } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  citationAmountClass,
  citationHistorySectionTitle,
  citationStatusCardClass,
  citationStatusClass,
  citationStatusLabel,
  citationsFromPayload,
  formatContrasteConsultedAt,
  formatContrasteRelative,
  groupItemsByCitationStatus,
  type EcuadorCitation,
  type EcuadorContrastePayload,
} from '@/lib/inventario/ecuadorContraste'
import { listContrasteConsultas, payloadFromConsulta } from '@/services/contrasteConsultas.service'

type Props = {
  placa: string
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`
}

function CitationRow({ item }: { item: EcuadorCitation }) {
  return (
    <li className={`rounded-xl border px-4 py-3 ${citationStatusCardClass(item.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.infraction || item.article || 'Citación'}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {[
              item.entity,
              item.citationNumber ? `N.º ${item.citationNumber}` : null,
              item.issueDate ? `emitida ${item.issueDate}` : null,
              item.paymentDeadline ? `vence ${item.paymentDeadline}` : null,
              item.points != null ? `${item.points} pts` : null,
              item.article,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <p className={`text-sm font-bold whitespace-nowrap ${citationAmountClass(item.status)}`}>
          {usd(item.total ?? item.fine ?? 0)}
        </p>
      </div>
    </li>
  )
}

export function MultasDeudasTab({ placa }: Props) {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<EcuadorContrastePayload | null>(null)
  const [consultedAt, setConsultedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPayload(null)
    setConsultedAt(null)
    void listContrasteConsultas(supabase, placa)
      .then((rows) => {
        if (cancelled) return
        const latest = rows[0]
        if (!latest) return
        const saved = payloadFromConsulta(latest)
        if (saved) {
          setPayload(saved)
          setConsultedAt(latest.created_at)
        }
      })
      .catch(() => {
        if (!cancelled) setPayload(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [placa, supabase])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando multas oficiales…</p>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <Scale className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">Aún no hay consulta oficial</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Pulsa <span className="font-semibold text-slate-700">Consultar</span> en Contraste oficial para
          traer el historial ANT (pendientes, pagadas e impugnadas).
        </p>
      </div>
    )
  }

  const citations = citationsFromPayload(payload)
  const groups = groupItemsByCitationStatus(citations)
  const pending = citations.filter((c) => (c.status || '').toLowerCase() === 'pending')
  const pendingTotal = pending.reduce((sum, c) => sum + (c.total ?? c.fine ?? 0), 0)
  const ant = payload.ant
  const antUnavailable = ant?.status === 'unavailable' || ant?.status === 'not_applicable'
  const hasFullHistory = payload.citations != null

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {consultedAt && (
        <p className="text-[11px] text-slate-500">
          Datos de la consulta del {formatContrasteConsultedAt(consultedAt)} (
          {formatContrasteRelative(consultedAt)}). No se volvió a llamar a EcuadorAPI.
        </p>
      )}

      {antUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            {ant?.status === 'not_applicable'
              ? 'La ANT no tiene registro de citaciones para esta placa.'
              : 'La ANT no estuvo disponible en esa consulta. Vuelve a Consultar en Contraste oficial si necesitas el listado.'}
          </p>
        </div>
      )}

      {!ant && citations.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Esta consulta guardada no incluye el detalle ANT. Pulsa Consultar en Contraste oficial para
            obtener el historial de citaciones.
          </p>
        </div>
      )}

      {!hasFullHistory && citations.length > 0 ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Esta consulta solo guardó pendientes. Consulta nuevamente para ver pagadas, impugnadas y anuladas.
        </p>
      ) : null}

      {pending.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">
            Hay <strong>{pending.length}</strong> citación{pending.length === 1 ? '' : 'es'} pendiente
            {pending.length === 1 ? '' : 's'} · total {usd(pendingTotal)}.
          </p>
        </div>
      ) : citations.length > 0 || ant?.status === 'ok' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
          <Check className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Sin citaciones pendientes</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              {citations.length > 0
                ? 'El historial incluye citaciones ya pagadas, impugnadas o anuladas.'
                : 'La ANT no reporta valores pendientes de pago para esta placa.'}
            </p>
          </div>
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.status}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h5 className="text-sm font-bold text-slate-900">{citationHistorySectionTitle(group.status)}</h5>
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${citationStatusClass(group.status)}`}>
              {citationStatusLabel(group.status)} · {group.items.length}
            </span>
          </div>
          <ul className="space-y-2">
            {group.items.map((item, i) => (
              <CitationRow key={`${item.citationNumber || item.id}-${i}`} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
