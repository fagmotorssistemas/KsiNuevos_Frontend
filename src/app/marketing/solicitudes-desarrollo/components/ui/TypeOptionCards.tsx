'use client'

import { Bug, HelpCircle, Lightbulb, MoreHorizontal, Sparkles } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import type { MarketingDevRequestType } from '@/types/marketing-dev-requests'

const ICONS: Record<MarketingDevRequestType, React.ReactNode> = {
  bug: <Bug className="h-5 w-5" />,
  feature: <Sparkles className="h-5 w-5" />,
  improvement: <Lightbulb className="h-5 w-5" />,
  support: <HelpCircle className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
}

type Option = { value: MarketingDevRequestType; label: string; hint: string }

export function TypeOptionCards({
  options,
  value,
  onChange,
}: {
  options: Option[]
  value: MarketingDevRequestType
  onChange: (v: MarketingDevRequestType) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={twMerge(
              'group flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200',
              selected
                ? 'border-violet-500 bg-violet-50/80 shadow-md shadow-violet-500/10'
                : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50/50',
            )}
          >
            <span
              className={twMerge(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700',
              )}
            >
              {ICONS[o.value]}
            </span>
            <span className={twMerge('font-bold text-sm', selected ? 'text-violet-900' : 'text-slate-800')}>
              {o.label}
            </span>
            <span className="text-xs text-slate-500 leading-snug">{o.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
