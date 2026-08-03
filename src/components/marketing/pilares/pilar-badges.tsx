'use client'

import {
  getPilarLabel,
  PILAR_SHORT_LABELS,
  type PilarSistema,
} from '@/types/pilar'

const SISTEMA_STYLES: Record<PilarSistema, string> = {
  pilar1: 'bg-sky-100 text-sky-800 border-sky-200',
  pilar2: 'bg-rose-100 text-rose-800 border-rose-200',
  pilar3: 'bg-amber-100 text-amber-900 border-amber-200',
  pilar4: 'bg-violet-100 text-violet-800 border-violet-200',
}

export function PilarSistemaBadge({
  sistema,
  hookCategoria,
}: {
  sistema: string
  hookCategoria?: string | null
}) {
  const key = sistema as PilarSistema
  const cls = SISTEMA_STYLES[key] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}
    >
      {PILAR_SHORT_LABELS[key] ?? getPilarLabel(sistema)}
      {hookCategoria ? <span className="opacity-70">· {hookCategoria}</span> : null}
    </span>
  )
}

export function PilarAssignmentStatusBadge({ status }: { status: string }) {
  const v = (status ?? '').toLowerCase()
  const cls =
    v === 'guion_generado'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : v === 'descartado'
        ? 'bg-gray-100 text-gray-600 border-gray-200'
        : 'bg-amber-100 text-amber-800 border-amber-200'
  const label =
    v === 'guion_generado'
      ? 'Guión generado'
      : v === 'descartado'
        ? 'Descartado'
        : v === 'pendiente_generacion'
          ? 'Pendiente'
          : v || '—'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  )
}
