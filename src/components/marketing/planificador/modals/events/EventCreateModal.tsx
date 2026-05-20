'use client'

import { useEffect, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { EventFormFields } from '@/components/marketing/planificador/modals/events/EventFormFields'
import { EventLinkedTasksSection } from '@/components/marketing/planificador/modals/events/EventLinkedTasksSection'
import {
  emptyEventForm,
  formToEventInput,
} from '@/components/marketing/planificador/modals/events/event-form-utils'
import type { EventFormState } from '@/components/marketing/planificador/modals/events/EventFormFields'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerEventInput } from '@/hooks/marketing/usePlannerEvents'
import { usePlannerTasks } from '@/hooks/marketing/usePlannerTasks'
import { usePlannerEventVehicles } from '@/hooks/marketing/usePlannerEventVehicles'
import type { DraftLinkedTask } from '@/types/marketing-planner'

type Props = {
  open: boolean
  onClose: () => void
  defaultStart?: string
  defaultEnd?: string
  onSave: (input: PlannerEventInput) => Promise<{ error?: string; id?: string }>
}

export function EventCreateModal({ open, onClose, defaultStart, defaultEnd, onSave }: Props) {
  const { isAdmin, effectiveOwnerId, bumpRefresh } = useMarketingPlannerContext()
  const { createTasksForEvent } = usePlannerTasks()
  const { syncEventVehicles } = usePlannerEventVehicles()
  const [form, setForm] = useState<EventFormState>(() =>
    emptyEventForm(defaultStart, defaultEnd, effectiveOwnerId ?? undefined),
  )
  const [linkedTasks, setLinkedTasks] = useState<DraftLinkedTask[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(emptyEventForm(defaultStart, defaultEnd, effectiveOwnerId ?? undefined))
      setLinkedTasks([])
    }
  }, [open, defaultStart, defaultEnd, effectiveOwnerId])

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const input = formToEventInput(form, isAdmin)
    const res = await onSave(input)
    if (res.error) {
      setSaving(false)
      return
    }
    if (res.id && form.inventoryIds.length > 0) {
      const vehRes = await syncEventVehicles(res.id, form.inventoryIds)
      if (vehRes.error) toast.error(`Evento creado, error en vehículos: ${vehRes.error}`)
    }
    if (res.id && linkedTasks.some((t) => t.title.trim())) {
      const ownerId = input.owner_id ?? effectiveOwnerId ?? ''
      const taskRes = await createTasksForEvent(res.id, linkedTasks, {
        owner_id: ownerId,
        visibility: input.visibility ?? 'personal',
        due_at: input.end_at,
        inventory_id: form.inventoryIds[0] ?? null,
      })
      if (taskRes.error) {
        toast.error(`Evento creado, pero falló alguna tarea: ${taskRes.error}`)
      } else {
        toast.success(
          `Evento creado con ${linkedTasks.filter((t) => t.title.trim()).length} tarea(s) vinculada(s)`,
        )
      }
      bumpRefresh()
    }
    setSaving(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title="Nuevo evento"
      subtitle="Programa la actividad y define tareas relacionadas"
      icon={<CalendarPlus className="h-5 w-5" />}
      size="2xl"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Crear evento"
          confirmLoading={saving}
          confirmDisabled={!form.title.trim()}
        />
      }
    >
      <div className="space-y-6">
        <EventFormFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <EventLinkedTasksSection tasks={linkedTasks} onChange={setLinkedTasks} />
      </div>
    </PlannerDialog>
  )
}
