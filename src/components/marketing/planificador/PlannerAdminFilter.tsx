'use client'

import { Users } from 'lucide-react'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'

export function PlannerAdminFilter() {
  const { isAdmin, teamMembers, memberFilter, setMemberFilter } = useMarketingPlannerContext()

  if (!isAdmin) return null

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <Users className="h-4 w-4 text-violet-600 shrink-0" />
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
        Ver
      </label>
      <select
        value={memberFilter}
        onChange={(e) => setMemberFilter(e.target.value)}
        className="text-sm font-medium text-slate-800 bg-transparent outline-none cursor-pointer min-w-[140px]"
      >
        <option value="all">Todo el equipo</option>
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name ?? m.id.slice(0, 8)}
          </option>
        ))}
      </select>
    </div>
  )
}
