'use client'

import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerEventInput } from '@/hooks/marketing/usePlannerEvents'
import { PlannerVehicleMultiSelect } from '@/components/marketing/planificador/ui/PlannerVehicleMultiSelect'
import { PlannerDateTimeField } from '@/components/marketing/planificador/ui/PlannerDateTimeField'
import {
  PlannerCheckbox,
  PlannerInput,
  PlannerSelect,
  PlannerTextarea,
} from '@/components/marketing/planificador/ui/PlannerForm'
import {
  endOfDayLocal,
  splitLocalDateTime,
  startOfDayLocal,
} from '@/lib/marketing-planner/timezone'

export type EventFormState = {
  title: string
  description: string
  eventType: PlannerEventInput['event_type']
  startLocal: string
  endLocal: string
  allDay: boolean
  location: string
  visibility: PlannerEventInput['visibility']
  status: PlannerEventInput['status']
  inventoryIds: string[]
  ownerId: string
}

type Props = {
  value: EventFormState
  onChange: (patch: Partial<EventFormState>) => void
  showStatus?: boolean
}

export function EventFormFields({ value, onChange, showStatus }: Props) {
  const { isAdmin, teamMembers } = useMarketingPlannerContext()

  return (
    <div className="space-y-4">
      <PlannerInput
        label="Título"
        required
        value={value.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Ej. Reunión de contenido semanal"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlannerSelect
          label="Tipo"
          value={value.eventType}
          onChange={(e) => onChange({ eventType: e.target.value as EventFormState['eventType'] })}
          options={[
            { value: 'event', label: 'Evento' },
            { value: 'meeting', label: 'Reunión' },
            { value: 'task_reminder', label: 'Recordatorio' },
            { value: 'content', label: 'Contenido / vehículo' },
          ]}
        />
        <PlannerSelect
          label="Visibilidad"
          value={value.visibility}
          onChange={(e) => onChange({ visibility: e.target.value as EventFormState['visibility'] })}
          options={[
            { value: 'personal', label: 'Personal' },
            { value: 'team', label: 'Equipo (todo marketing)' },
          ]}
        />
      </div>

      {isAdmin && (
        <PlannerSelect
          label="Responsable"
          value={value.ownerId}
          onChange={(e) => onChange({ ownerId: e.target.value })}
          options={teamMembers.map((m) => ({
            value: m.id,
            label: m.full_name ?? m.id.slice(0, 8),
          }))}
        />
      )}

      <PlannerCheckbox
        id="event-all-day"
        label="Todo el día"
        checked={value.allDay}
        onChange={(allDay) => {
          if (allDay) {
            const s = splitLocalDateTime(value.startLocal).dateYmd
            const e = splitLocalDateTime(value.endLocal).dateYmd
            onChange({
              allDay: true,
              startLocal: startOfDayLocal(s),
              endLocal: endOfDayLocal(e),
            })
          } else {
            onChange({ allDay: false })
          }
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlannerDateTimeField
          label="Inicio"
          required
          dateOnly={value.allDay}
          value={value.startLocal}
          onChange={(startLocal) => {
            const patch: Partial<EventFormState> = { startLocal }
            if (value.allDay) {
              const s = splitLocalDateTime(startLocal).dateYmd
              const e = splitLocalDateTime(value.endLocal).dateYmd
              if (s && e && s > e) patch.endLocal = endOfDayLocal(s)
            }
            onChange(patch)
          }}
        />
        <PlannerDateTimeField
          label="Fin"
          required
          dateOnly={value.allDay}
          value={value.endLocal}
          onChange={(endLocal) => onChange({ endLocal })}
        />
      </div>

      <PlannerInput
        label="Ubicación"
        value={value.location}
        onChange={(e) => onChange({ location: e.target.value })}
        placeholder="Showroom, Zoom, etc."
      />

      <PlannerVehicleMultiSelect
        selectedIds={value.inventoryIds}
        onChange={(inventoryIds) => onChange({ inventoryIds })}
      />

      <PlannerTextarea
        label="Descripción"
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Detalles, agenda, entregables…"
      />

      {showStatus && (
        <PlannerSelect
          label="Estado"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as EventFormState['status'] })}
          options={[
            { value: 'scheduled', label: 'Programado' },
            { value: 'in_progress', label: 'En curso' },
            { value: 'completed', label: 'Completado' },
            { value: 'cancelled', label: 'Cancelado' },
          ]}
        />
      )}
    </div>
  )
}
