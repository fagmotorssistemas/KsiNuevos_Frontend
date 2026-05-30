'use client'

import { Search, User } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { DevInput } from './DevFormPrimitives'
import { STATUS_LABELS } from '../../constants'
import type { MarketingDevRequestStatus } from '@/types/marketing-dev-requests'

const FILTER_STATUSES: MarketingDevRequestStatus[] = [
  'new',
  'in_review',
  'in_progress',
  'resolved',
  'rejected',
]

type Props = {
  search: string
  onSearch: (v: string) => void
  statusFilter: MarketingDevRequestStatus | 'all'
  onStatusFilter: (v: MarketingDevRequestStatus | 'all') => void
  mineOnly: boolean
  onMineOnly: (v: boolean) => void
  totalCount: number
  isAdmin?: boolean
  areaLabel?: string
}

export function FilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  mineOnly,
  onMineOnly,
  totalCount,
  isAdmin = false,
  areaLabel,
}: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
        <DevInput
          className="pl-10 h-12 rounded-xl"
          placeholder="Buscar por código, título o persona…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_STATUSES.map((s) => {
          const active = statusFilter === s
          const label = STATUS_LABELS[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilter(s)}
              className={twMerge(
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition-all',
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onMineOnly(!mineOnly)}
            className={twMerge(
              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all',
              mineOnly ? 'bg-violet-100 text-violet-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
            )}
          >
            <User className="h-4 w-4" />
            Solo mis solicitudes
          </button>
        ) : (
          <p className="text-xs text-slate-500">
            Mostrando solicitudes de {areaLabel ?? 'tu área'}
          </p>
        )}
        <span className="text-xs font-medium text-slate-500">
          {totalCount} resultado{totalCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
