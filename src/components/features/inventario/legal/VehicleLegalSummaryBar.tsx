'use client'

import { Calendar, FileText, Shield, Ticket } from 'lucide-react'
import type { VehicleLegalSummary } from '@/types/vehicleLegal.types'

function legalBadge(tone: VehicleLegalSummary['legalStatusTone']) {
  if (tone === 'ok') return 'bg-emerald-500 text-white'
  if (tone === 'danger') return 'bg-orange-500 text-white'
  return 'bg-amber-500 text-white'
}

export function VehicleLegalSummaryBar({ summary }: { summary: VehicleLegalSummary }) {
  const docsOk = summary.docsComplete >= summary.docsTotal && summary.docsTotal > 0
  const hasFines = summary.pendingFinesCount > 0
  const matriculaSoon =
    summary.matriculaDaysUntilExpiry != null && summary.matriculaDaysUntilExpiry <= 30

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
            <Ticket className="h-4 w-4 text-red-600" />
          </span>
          <p className="text-xs text-slate-500">Multas pendientes</p>
        </div>
        <p className={`text-xl font-bold mt-2 ${hasFines ? 'text-red-600' : 'text-slate-700'}`}>
          {hasFines ? `$${summary.pendingFinesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600" />
          </span>
          <p className="text-xs text-slate-500">Matrícula vence</p>
        </div>
        <p className={`text-xl font-bold mt-2 capitalize ${matriculaSoon ? 'text-amber-700' : 'text-blue-600'}`}>
          {summary.matriculaExpiryLabel
            ? summary.matriculaExpiryLabel
            : summary.matriculaDaysUntilExpiry != null
              ? summary.matriculaDaysUntilExpiry <= 0
                ? 'Vencida'
                : `${summary.matriculaDaysUntilExpiry} días`
              : '—'}
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
