'use client'

import {
  CalendarDays,
  CheckSquare,
  FolderOpen,
  LayoutGrid,
} from 'lucide-react'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerTab } from '@/types/marketing-planner'

const TABS: { id: PlannerTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'resources', label: 'Recursos', icon: FolderOpen },
]

export function PlannerTabs() {
  const { tab, setTab } = useMarketingPlannerContext()

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100/80 p-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : ''}`} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
