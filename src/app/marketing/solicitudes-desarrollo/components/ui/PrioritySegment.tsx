'use client'

import { twMerge } from 'tailwind-merge'
import type { MarketingDevRequestPriority } from '@/types/marketing-dev-requests'

const STYLES: Record<
  MarketingDevRequestPriority,
  { active: string; idle: string; dot: string }
> = {
  low: {
    active: 'bg-slate-700 text-white border-slate-700',
    idle: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
    dot: 'bg-slate-400',
  },
  medium: {
    active: 'bg-sky-600 text-white border-sky-600',
    idle: 'bg-white text-sky-700 border-sky-200 hover:border-sky-400',
    dot: 'bg-sky-400',
  },
  high: {
    active: 'bg-amber-500 text-white border-amber-500',
    idle: 'bg-white text-amber-800 border-amber-200 hover:border-amber-400',
    dot: 'bg-amber-400',
  },
  urgent: {
    active: 'bg-rose-600 text-white border-rose-600',
    idle: 'bg-white text-rose-700 border-rose-200 hover:border-rose-400',
    dot: 'bg-rose-500',
  },
}

const SHORT: Record<MarketingDevRequestPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

type Option = { value: MarketingDevRequestPriority; label: string }

export function PrioritySegment({
  options,
  value,
  onChange,
}: {
  options: Option[]
  value: MarketingDevRequestPriority
  onChange: (v: MarketingDevRequestPriority) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {options.map((o) => {
        const selected = value === o.value
        const s = STYLES[o.value]
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.label}
            className={twMerge(
              'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-all',
              selected ? s.active : s.idle,
            )}
          >
            <span className={twMerge('h-2 w-2 rounded-full', selected ? 'bg-white/90' : s.dot)} />
            <span className="text-sm font-bold">{SHORT[o.value]}</span>
          </button>
        )
      })}
    </div>
  )
}
