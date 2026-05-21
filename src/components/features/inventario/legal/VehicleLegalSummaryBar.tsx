'use client'

import type { VehicleLegalSummary } from '@/types/vehicleLegal.types'

function toneClass(tone: VehicleLegalSummary['legalStatusTone']) {
  if (tone === 'ok') return 'text-emerald-600'
  if (tone === 'danger') return 'text-red-600'
  return 'text-amber-700'
}

export function VehicleLegalSummaryBar({ summary }: { summary: VehicleLegalSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/80 border-b border-slate-100">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-slate-400">Docs completos</p>
        <p className="text-lg font-bold text-emerald-600 mt-0.5">
          {summary.docsComplete}/{summary.docsTotal}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-slate-400">Multas pendientes</p>
        <p className={`text-lg font-bold mt-0.5 ${summary.pendingFinesCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
          {summary.pendingFinesCount > 0 ? `$${summary.pendingFinesTotal.toLocaleString()}` : '$0'}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-slate-400">Matrícula vence</p>
        <p className={`text-lg font-bold mt-0.5 ${summary.matriculaDaysUntilExpiry != null && summary.matriculaDaysUntilExpiry <= 30 ? 'text-amber-700' : 'text-slate-600'}`}>
          {summary.matriculaDaysUntilExpiry != null
            ? summary.matriculaDaysUntilExpiry <= 0
              ? 'Vencida'
              : `${summary.matriculaDaysUntilExpiry} días`
            : '—'}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-slate-400">Estado legal</p>
        <p className={`text-lg font-bold mt-0.5 ${toneClass(summary.legalStatusTone)}`}>{summary.legalStatusLabel}</p>
      </div>
    </div>
  )
}
