'use client'

import { twMerge } from 'tailwind-merge'
import { STATUS_LABELS, STATUS_STYLES } from '../../constants'
import type { MarketingDevRequestStatus } from '@/types/marketing-dev-requests'

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: MarketingDevRequestStatus
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full font-semibold',
        STATUS_STYLES[status],
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
