'use client'

import { useEffect, useState } from 'react'
import { Calendar, MapPin, Pencil, Car, ListTodo, CheckCircle2 } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { PlannerVisibilityBadge } from '@/components/marketing/planificador/PlannerVisibilityBadge'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import { usePlannerTasks } from '@/hooks/marketing/usePlannerTasks'
import type { PlannerEvent, PlannerTask } from '@/types/marketing-planner'
import { formatEcuador } from '@/lib/marketing-planner/timezone'
import { formatVehicleLabel } from '@/components/marketing/planificador/ui/PlannerVehicleMultiSelect'

const STATUS_LABELS: Record<PlannerEvent['status'], string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const TYPE_LABELS: Record<PlannerEvent['event_type'], string> = {
  event: 'Evento',
  meeting: 'Reunión',
  task_reminder: 'Recordatorio',
  content: 'Contenido',
}

const TASK_STATUS: Record<PlannerTask['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

type Props = {
  open: boolean
  onClose: () => void
  event: PlannerEvent
  onEdit: () => void
}

export function EventViewModal({ open, onClose, event, onEdit }: Props) {
  const { setTab } = useMarketingPlannerContext()
  const { fetchTasksByEventId } = usePlannerTasks()
  const [linkedTasks, setLinkedTasks] = useState<PlannerTask[]>([])

  useEffect(() => {
    if (!open) return
    void fetchTasksByEventId(event.id).then(setLinkedTasks)
  }, [open, event.id, fetchTasksByEventId])

  const pendingCount = linkedTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={event.title}
      subtitle={TYPE_LABELS[event.event_type]}
      icon={<Calendar className="h-5 w-5" />}
      size="2xl"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={onEdit}
          cancelLabel="Cerrar"
          confirmLabel="Editar"
          extra={
            linkedTasks.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  setTab('tasks')
                }}
                className="text-sm font-semibold text-violet-700 hover:underline"
              >
                Ver en Tareas ({linkedTasks.length})
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <OwnerBadge owner={event.owner} creator={event.creator} showCreatorIfDifferent />
          <PlannerVisibilityBadge visibility={event.visibility} />
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {STATUS_LABELS[event.status]}
          </span>
        </div>

        <div
          className="rounded-xl border-l-4 px-4 py-3 bg-slate-50"
          style={{ borderLeftColor: event.color }}
        >
          <p className="text-sm font-semibold text-slate-800">
            {formatEcuador(event.start_at, "EEEE d MMM · HH:mm")}
            {' – '}
            {formatEcuador(event.end_at, 'HH:mm')}
          </p>
          {event.all_day && <p className="text-xs text-slate-500 mt-1">Todo el día</p>}
        </div>

        {event.location && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
            {event.location}
          </div>
        )}

        {(() => {
          const vehicles =
            event.event_vehicles?.map((ev) => ev.inventory).filter(Boolean) ??
            (event.inventory ? [event.inventory] : [])
          if (vehicles.length === 0) return null
          return (
            <div className="rounded-xl bg-violet-50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-violet-800">
                <Car className="h-4 w-4 shrink-0" />
                <p className="text-xs font-bold uppercase">
                  Vehículo{vehicles.length !== 1 ? 's' : ''} ({vehicles.length})
                </p>
              </div>
              <ul className="space-y-1">
                {vehicles.map((v) => (
                  <li key={v!.id} className="text-sm font-medium text-slate-800">
                    {formatVehicleLabel({
                      brand: v!.brand ?? '',
                      model: v!.model ?? '',
                      year: v!.year ?? 0,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}

        {event.description && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Descripción</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{event.description}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-bold text-slate-900">Tareas vinculadas</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} / {linkedTasks.length} total
            </span>
          </div>
          {linkedTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 px-4">
              No hay tareas vinculadas. Edita el evento para añadirlas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {linkedTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'text-slate-500' : 'text-slate-800'}`}>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{TASK_STATUS[t.status]}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PlannerDialog>
  )
}
