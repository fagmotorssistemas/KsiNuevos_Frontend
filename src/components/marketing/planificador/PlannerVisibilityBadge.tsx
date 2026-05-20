'use client'

import { Users, User } from 'lucide-react'
import type { PlannerVisibility } from '@/types/marketing-planner'

export function PlannerVisibilityBadge({ visibility }: { visibility: PlannerVisibility }) {
  const team = visibility === 'team'
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
        team ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {team ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {team ? 'Equipo' : 'Personal'}
    </span>
  )
}
