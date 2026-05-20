'use client'

import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerTaskInput } from '@/hooks/marketing/usePlannerTasks'
import { PLANNER_TASK_CATEGORIES } from '@/types/marketing-planner'
import { PlannerDateTimeField } from '@/components/marketing/planificador/ui/PlannerDateTimeField'
import {
  PlannerInput,
  PlannerSelect,
  PlannerTextarea,
} from '@/components/marketing/planificador/ui/PlannerForm'

export type TaskFormState = {
  title: string
  description: string
  priority: PlannerTaskInput['priority']
  dueLocal: string
  category: string
  visibility: PlannerTaskInput['visibility']
  status: PlannerTaskInput['status']
  ownerId: string
}

type Props = {
  value: TaskFormState
  onChange: (patch: Partial<TaskFormState>) => void
  showStatus?: boolean
}

export function TaskFormFields({ value, onChange, showStatus }: Props) {
  const { isAdmin, teamMembers } = useMarketingPlannerContext()

  return (
    <div className="space-y-4">
      <PlannerInput
        label="Título"
        required
        value={value.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Ej. Subir fotos del lote Toyota"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlannerSelect
          label="Prioridad"
          value={value.priority}
          onChange={(e) => onChange({ priority: e.target.value as TaskFormState['priority'] })}
          options={[
            { value: 'baja', label: 'Baja' },
            { value: 'media', label: 'Media' },
            { value: 'alta', label: 'Alta' },
          ]}
        />
        <PlannerSelect
          label="Visibilidad"
          value={value.visibility}
          onChange={(e) => onChange({ visibility: e.target.value as TaskFormState['visibility'] })}
          options={[
            { value: 'personal', label: 'Personal' },
            { value: 'team', label: 'Equipo' },
          ]}
        />
      </div>

      <PlannerSelect
        label="Categoría"
        value={value.category}
        onChange={(e) => onChange({ category: e.target.value })}
        options={PLANNER_TASK_CATEGORIES.map((c) => ({
          value: c,
          label: c.charAt(0).toUpperCase() + c.slice(1),
        }))}
      />

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

      <PlannerDateTimeField
        label="Fecha límite"
        value={value.dueLocal}
        onChange={(dueLocal) => onChange({ dueLocal })}
        allowClear
        emptyPreview="Sin fecha límite"
        hint="Opcional"
      />

      <PlannerTextarea
        label="Instrucciones / notas"
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Qué debe entregarse al completar esta tarea…"
      />

      {showStatus && (
        <PlannerSelect
          label="Estado"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as TaskFormState['status'] })}
          options={[
            { value: 'pending', label: 'Pendiente' },
            { value: 'in_progress', label: 'En progreso' },
            { value: 'completed', label: 'Completada' },
            { value: 'cancelled', label: 'Cancelada' },
          ]}
        />
      )}
    </div>
  )
}
