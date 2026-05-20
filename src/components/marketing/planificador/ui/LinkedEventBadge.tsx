'use client'

import { Calendar } from 'lucide-react'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerTask } from '@/types/marketing-planner'
import { formatEcuador } from '@/lib/marketing-planner/timezone'

export function LinkedEventBadge({ task }: { task: PlannerTask }) {
  const { openEventInCalendar } = useMarketingPlannerContext()
  const ev = task.linked_event
  if (!ev) return null

  return (
    <button
      type="button"
      onClick={() => openEventInCalendar(ev.id)}
      className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors hover:opacity-90"
      style={{
        backgroundColor: `${ev.color}18`,
        color: ev.color,
        borderColor: `${ev.color}40`,
      }}
      title="Ver evento en calendario"
    >
      <Calendar className="h-3 w-3 shrink-0" />
      <span className="truncate">{ev.title}</span>
      <span className="opacity-70 font-medium hidden sm:inline">
        · {formatEcuador(ev.start_at, 'd MMM')}
      </span>
    </button>
  )
}
