'use client'

import {
  getReelFormatoLabel,
  REEL_ASSIGNMENT_STATUS_LABELS,
  resolveHablanteLabel,
  type ReelHablante,
  type ReelScript,
} from '@/types/reel'

const FORMATO_STYLES: Record<string, string> = {
  ficha_rapida: 'bg-blue-100 text-blue-800 border-blue-200',
  pov_gancho: 'bg-purple-100 text-purple-800 border-purple-200',
  duelo: 'bg-orange-100 text-orange-800 border-orange-200',
  financiamiento: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  detras_camaras: 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

export function ReelFormatoBadge({
  formato,
  variante,
}: {
  formato: string
  variante?: string | null
}) {
  const cls = FORMATO_STYLES[formato] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}
    >
      {getReelFormatoLabel(formato)}
      {variante ? <span className="opacity-70">· {variante}</span> : null}
    </span>
  )
}

export function ReelAssignmentStatusBadge({ status }: { status: string }) {
  const v = (status ?? '').toLowerCase()
  const cls =
    v === 'guion_generado'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : v === 'descartado'
        ? 'bg-gray-100 text-gray-600 border-gray-200'
        : 'bg-amber-100 text-amber-800 border-amber-200'
  const label = REEL_ASSIGNMENT_STATUS_LABELS[v] ?? (v || '—')

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  )
}

const HABLANTE_STYLES: Record<string, string> = {
  VENDEDOR: 'bg-violet-100 text-violet-800 border-violet-200',
  VENDEDOR_2: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  CAMARA: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function ReelHablanteBadge({
  hablante,
  script,
}: {
  hablante: ReelHablante | undefined
  script: Pick<ReelScript, 'formato' | 'vendedor_nombre' | 'vendedor_secundario_nombre'>
}) {
  const label = resolveHablanteLabel(hablante, script)
  if (!label) {
    return <span className="text-gray-300 text-xs">—</span>
  }
  const key = (hablante ?? '').trim().toUpperCase()
  const cls = HABLANTE_STYLES[key] ?? 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  )
}
