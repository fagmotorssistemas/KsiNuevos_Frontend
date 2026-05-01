'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function GuionTipoBadge({
  tipo,
  objecionTipo,
}: {
  tipo: string
  objecionTipo?: string | null
}) {
  const t = (tipo ?? '').toLowerCase()
  const cls =
    t === 'venta'
      ? 'bg-green-100 text-green-800 border-green-200'
      : t === 'informativo'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : t === 'educativo'
          ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
          : t === 'frio'
            ? 'bg-gray-100 text-gray-700 border-gray-200'
            : t === 'comparacion'
              ? 'bg-orange-100 text-orange-800 border-orange-200'
              : t === 'objecion'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'

  const label =
    t === 'objecion' && objecionTipo
      ? `Objeción: ${objecionTipo}`
      : t
        ? t.charAt(0).toUpperCase() + t.slice(1)
        : '—'

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  )
}

export function SemanaBadge({ semanaTipo }: { semanaTipo: number | null }) {
  const map: Record<number, string> = {
    1: 'Semana 1 – Mixta',
    2: 'Semana 2 – Audiencia fría',
    3: 'Semana 3 – Comparación',
    4: 'Semana 4 – Objeciones',
  }
  const label = semanaTipo ? map[semanaTipo] ?? `Semana ${semanaTipo}` : 'Semana —'
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-100">
      {label}
    </span>
  )
}

export function RetentionBadge({ retentionRate }: { retentionRate: number | null }) {
  const pct = retentionRate === null || retentionRate === undefined ? null : Math.round(retentionRate * 100)
  const cls =
    pct === null
      ? 'bg-gray-100 text-gray-700 border-gray-200'
      : pct >= 60
        ? 'bg-green-100 text-green-800 border-green-200'
        : pct >= 40
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-red-100 text-red-800 border-red-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {pct === null ? '—' : `${pct}%`}
    </span>
  )
}

export function FechaText({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400">—</span>
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return <span className="text-gray-400">—</span>
  return <span>{format(d, 'dd/MM/yyyy', { locale: es })}</span>
}

