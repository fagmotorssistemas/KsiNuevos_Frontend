'use client'

import { MarketingPlannerProvider, useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import { PlannerTabs } from '@/components/marketing/planificador/PlannerTabs'
import { PlannerAdminFilter } from '@/components/marketing/planificador/PlannerAdminFilter'
import { PlannerRoleGuard } from '@/components/marketing/planificador/PlannerRoleGuard'
import { OverviewTab } from '@/components/marketing/planificador/OverviewTab'
import { CalendarTab } from '@/components/marketing/planificador/CalendarTab'
import { TasksTab } from '@/components/marketing/planificador/TasksTab'
import { ResourcesTab } from '@/components/marketing/planificador/ResourcesTab'

function PlannerContent() {
  const { tab } = useMarketingPlannerContext()

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
            Marketing / Planificador
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Planificador</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">
            Calendario, tareas y recursos del equipo. Eventos de equipo visibles para todo marketing.
          </p>
        </div>
        <PlannerAdminFilter />
      </header>

      <PlannerTabs />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'calendar' && <CalendarTab />}
      {tab === 'tasks' && <TasksTab />}
      {tab === 'resources' && <ResourcesTab />}
    </div>
  )
}

export default function MarketingPlanificadorPage() {
  return (
    <PlannerRoleGuard>
      <MarketingPlannerProvider>
        <PlannerContent />
      </MarketingPlannerProvider>
    </PlannerRoleGuard>
  )
}
