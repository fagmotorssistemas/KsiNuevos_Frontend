'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { addDays, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, MapPin } from 'lucide-react'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import { usePlannerEvents } from '@/hooks/marketing/usePlannerEvents'
import { usePlannerTasks } from '@/hooks/marketing/usePlannerTasks'
import { MonthCalendarGrid } from '@/components/marketing/planificador/MonthCalendarGrid'
import { PlannerVisibilityBadge } from '@/components/marketing/planificador/PlannerVisibilityBadge'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { TaskCompleteModal } from '@/components/marketing/planificador/modals/tasks/TaskCompleteModal'
import type { PlannerTask } from '@/types/marketing-planner'
import { toast } from 'sonner'
import { formatEcuador, getMonthRange, rangeToIsoQuery } from '@/lib/marketing-planner/timezone'
import type { PlannerEventStatus } from '@/types/marketing-planner'

const STATUS_STYLES: Record<PlannerEventStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<PlannerEventStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export function OverviewTab() {
  const { setTab } = useMarketingPlannerContext()
  const [anchor, setAnchor] = useState(() => new Date())
  const monthRange = getMonthRange(anchor)
  const { from, to } = rangeToIsoQuery(monthRange.start, monthRange.end)
  const { events, loading: loadingEv } = usePlannerEvents({ from, to })
  const { tasks, stats, loading: loadingTk, completeTaskWithProof } = usePlannerTasks()
  const [completeTask, setCompleteTask] = useState<PlannerTask | null>(null)

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((e) => new Date(e.end_at).getTime() >= now && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 5)
  }, [events])

  const topTasks = useMemo(() => tasks.slice(0, 6), [tasks])

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [])

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <MonthCalendarGrid
          anchor={anchor}
          events={events}
          selectedDay={anchor}
          onSelectDay={setAnchor}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Esta semana</p>
          <div className="flex justify-between gap-1">
            {weekDays.map((d) => {
              const n = events.filter(
                (e) => format(new Date(e.start_at), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'),
              ).length
              return (
                <div key={d.toISOString()} className="flex-1 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {format(d, 'EEE', { locale: es })}
                  </p>
                  <p className="text-sm font-bold text-slate-800">{format(d, 'd')}</p>
                  {n > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-600 mt-1" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Próximos eventos</h3>
            <button
              type="button"
              onClick={() => setTab('calendar')}
              className="text-sm font-semibold text-violet-600 flex items-center gap-1 hover:underline"
            >
              Ver calendario <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loadingEv ? (
              <p className="p-6 text-center text-slate-400 text-sm">Cargando…</p>
            ) : upcoming.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-sm">Sin eventos próximos</p>
            ) : (
              upcoming.map((ev) => {
                const d = new Date(ev.start_at)
                return (
                  <div key={ev.id} className="flex gap-4 p-4 hover:bg-slate-50/80">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-xl font-black text-slate-900">{format(d, 'd')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {format(d, 'EEE', { locale: es })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{ev.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[ev.status]}`}>
                          {STATUS_LABELS[ev.status]}
                        </span>
                        <PlannerVisibilityBadge visibility={ev.visibility} />
                        <OwnerBadge owner={ev.owner} creator={ev.creator} showCreatorIfDifferent />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatEcuador(ev.start_at, 'HH:mm')} – {formatEcuador(ev.end_at, 'HH:mm')}
                      </p>
                      {ev.location && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {ev.location}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">Tareas pendientes</h3>
              <p className="text-xs text-slate-400">{stats.pending} pendientes · {stats.overdue} vencidas</p>
            </div>
            <button
              type="button"
              onClick={() => setTab('tasks')}
              className="text-sm font-semibold text-violet-600 flex items-center gap-1 hover:underline"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {loadingTk ? (
              <p className="text-center text-slate-400 text-sm py-4">Cargando…</p>
            ) : topTasks.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">¡Todo al día!</p>
            ) : (
              topTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50"
                >
                  <span className={`text-sm font-medium flex-1 ${t.status === 'completed' ? 'text-slate-500' : 'text-slate-800'}`}>
                    {t.title}
                  </span>
                  {t.status !== 'completed' && t.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => setCompleteTask(t)}
                      className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completar
                    </button>
                  )}
                  {t.due_at && (
                    <span className="text-xs font-bold text-amber-700 shrink-0">
                      {formatEcuador(t.due_at, 'd MMM')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {completeTask && (
        <TaskCompleteModal
          open={!!completeTask}
          onClose={() => setCompleteTask(null)}
          task={completeTask}
          onSubmit={async (proof) => {
            const res = await completeTaskWithProof(completeTask.id, proof)
            if (res.error) toast.error(res.error)
            else toast.success('Tarea completada')
            return res
          }}
        />
      )}
    </div>
  )
}
