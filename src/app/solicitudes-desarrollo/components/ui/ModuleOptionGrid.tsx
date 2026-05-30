'use client'

import { twMerge } from 'tailwind-merge'
import type { MarketingDevTargetModule } from '@/types/marketing-dev-requests'

type Option = { value: MarketingDevTargetModule; label: string }

export function ModuleOptionGrid({
  options,
  value,
  onChange,
}: {
  options: Option[]
  value: MarketingDevTargetModule
  onChange: (v: MarketingDevTargetModule) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value
        const short = o.label.split('/')[0].trim()
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            onClick={() => onChange(o.value)}
            className={twMerge(
              'rounded-xl px-3.5 py-2 text-sm font-semibold border-2 transition-all',
              selected
                ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-800',
            )}
          >
            {short}
          </button>
        )
      })}
    </div>
  )
}
