'use client'

import { useEffect, useState } from 'react'
import { Calendar, CircleDollarSign, FileText, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { officialMatriculaStatus, officialPendingSummary, type OfficialPendingSummary } from '@/lib/inventario/ecuadorContraste'
import { listContrasteConsultas, payloadFromConsulta } from '@/services/contrasteConsultas.service'
import type { VehicleLegalSummary } from '@/types/vehicleLegal.types'

function legalBadge(tone: VehicleLegalSummary['legalStatusTone']) {
  if (tone === 'ok') return 'bg-emerald-500 text-white'
  if (tone === 'danger') return 'bg-orange-500 text-white'
  return 'bg-amber-500 text-white'
}

function money(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function PendingChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
      {label} {value}
    </span>
  )
}

export function VehicleLegalSummaryBar({
  summary,
  placa,
}: {
  summary: VehicleLegalSummary
  placa: string
}) {
  const { supabase } = useAuth()
  const [pending, setPending] = useState<OfficialPendingSummary | null>(null)
  const [hasConsulta, setHasConsulta] = useState(false)
  const [matriculaApi, setMatriculaApi] = useState<{ expired: boolean | null; expiryLabel: string | null }>({
    expired: null,
    expiryLabel: null,
  })
  const docsOk = summary.docsComplete >= summary.docsTotal && summary.docsTotal > 0
  const expiredFromFicha = summary.matriculaDaysUntilExpiry != null ? summary.matriculaDaysUntilExpiry <= 0 : null
  const matriculaExpired = matriculaApi.expired ?? expiredFromFicha
  const matriculaDate = matriculaApi.expiryLabel || summary.matriculaExpiryLabel

  useEffect(() => {
    let cancelled = false
    void listContrasteConsultas(supabase, placa)
      .then((rows) => {
        if (cancelled) return
        const payload = rows[0] ? payloadFromConsulta(rows[0]) : null
        setHasConsulta(Boolean(payload))
        setPending(payload ? officialPendingSummary(payload) : null)
        setMatriculaApi(officialMatriculaStatus(payload))
      })
      .catch(() => {
        if (!cancelled) {
          setHasConsulta(false)
          setPending(null)
          setMatriculaApi({ expired: null, expiryLabel: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [supabase, placa])

  const hasDebt = Boolean(pending && pending.total > 0.009)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/80 border-b border-slate-100">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-emerald-600" />
          </span>
          <p className="text-xs text-slate-500">Documentos completos</p>
        </div>
        <p className={`text-xl font-bold mt-2 ${docsOk ? 'text-emerald-600' : 'text-slate-800'}`}>
          {summary.docsComplete} de {summary.docsTotal}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
            <CircleDollarSign className="h-4 w-4 text-red-600" />
          </span>
          <p className="text-xs text-slate-500">Valores pendientes</p>
        </div>
        <p className={`text-xl font-bold mt-2 ${hasDebt ? 'text-red-600' : 'text-slate-700'}`}>
          {!hasConsulta ? '—' : money(pending?.total ?? 0)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {!hasConsulta ? (
            <span className="text-[10px] text-slate-400">Sin consulta oficial</span>
          ) : (
            <>
              <PendingChip label="SRI" value={money(pending?.sriTotal ?? 0)} />
              <PendingChip
                label="ANT"
                value={
                  (pending?.citationsCount ?? 0) > 0
                    ? `${pending?.citationsCount} · ${money(pending?.antTotal ?? 0)}`
                    : money(pending?.antTotal ?? 0)
                }
              />
              {(pending?.sriRevision ?? 0) > 0.009 ? (
                <PendingChip label="RTV" value={money(pending?.sriRevision ?? 0)} />
              ) : null}
              {(pending?.amtTotal ?? 0) > 0.009 ? (
                <PendingChip label="AMT" value={money(pending?.amtTotal ?? 0)} />
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600" />
          </span>
          <p className="text-xs text-slate-500">Estado de matrícula</p>
        </div>
        <p
          className={`text-xl font-bold mt-2 ${
            matriculaExpired === true ? 'text-red-600' : matriculaExpired === false ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          {matriculaExpired === true ? 'Vencida' : matriculaExpired === false ? 'Vigente' : '—'}
        </p>
        <p className="mt-1 text-[10px] font-medium text-slate-500">
          {matriculaDate
            ? matriculaExpired
              ? `Venció el ${matriculaDate}`
              : `Vence el ${matriculaDate}`
            : hasConsulta
              ? 'Sin fecha en la consulta oficial'
              : 'Sin consulta ni fecha en ficha'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
            <Shield className="h-4 w-4 text-orange-500" />
          </span>
          <p className="text-xs text-slate-500">Estado legal</p>
        </div>
        <div className="mt-2">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${legalBadge(summary.legalStatusTone)}`}>
            {summary.legalStatusLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
