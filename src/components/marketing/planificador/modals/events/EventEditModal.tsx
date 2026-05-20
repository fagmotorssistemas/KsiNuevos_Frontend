'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { EventFormFields } from '@/components/marketing/planificador/modals/events/EventFormFields'
import {
  EventLinkedTasksSection,
  draftsFromTasks,
} from '@/components/marketing/planificador/modals/events/EventLinkedTasksSection'
import {
  eventToForm,
  formToEventInput,
} from '@/components/marketing/planificador/modals/events/event-form-utils'
import type { EventFormState } from '@/components/marketing/planificador/modals/events/EventFormFields'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerEvent } from '@/types/marketing-planner'
import type { PlannerEventInput } from '@/hooks/marketing/usePlannerEvents'
import { usePlannerTasks } from '@/hooks/marketing/usePlannerTasks'
import { usePlannerEventVehicles } from '@/hooks/marketing/usePlannerEventVehicles'
import { getEventInventoryIds } from '@/components/marketing/planificador/modals/events/event-form-utils'
import type { DraftLinkedTask } from '@/types/marketing-planner'

type Props = {
  open: boolean
  onClose: () => void
  event: PlannerEvent
  onSave: (input: PlannerEventInput) => Promise<{ error?: string }>
  onDelete?: () => void
}

export function EventEditModal({ open, onClose, event, onSave, onDelete }: Props) {
  const { isAdmin, bumpRefresh } = useMarketingPlannerContext()
  const { fetchTasksByEventId, syncEventLinkedTasks } = usePlannerTasks()
  const { fetchVehicleIdsForEvent, syncEventVehicles } = usePlannerEventVehicles()
  const [form, setForm] = useState<EventFormState>(() => eventToForm(event))
  const [linkedTasks, setLinkedTasks] = useState<DraftLinkedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(eventToForm(event))
    setLoadingTasks(true)
    void Promise.all([fetchTasksByEventId(event.id), fetchVehicleIdsForEvent(event.id)]).then(
      ([rows, vehicleIds]) => {
        setLinkedTasks(draftsFromTasks(rows))
        setForm((f) => ({ ...f, inventoryIds: vehicleIds.length ? vehicleIds : getEventInventoryIds(event) }))
        setLoadingTasks(false)
      },
    )
  }, [open, event, fetchTasksByEventId, fetchVehicleIdsForEvent])

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const input = formToEventInput(form, isAdmin)
    const res = await onSave(input)
    if (!res.error) {
      const vehRes = await syncEventVehicles(event.id, form.inventoryIds)
      if (vehRes.error) toast.error(`Evento guardado, error en vehículos: ${vehRes.error}`)
      const syncRes = await syncEventLinkedTasks(event.id, linkedTasks, {
        owner_id: input.owner_id ?? event.owner_id,
        visibility: input.visibility ?? event.visibility,
        due_at: input.end_at,
        inventory_id: form.inventoryIds[0] ?? null,
      })
      if (syncRes.error) toast.error(`Evento guardado, error en tareas: ${syncRes.error}`)
      else bumpRefresh()
    }
    setSaving(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title="Editar evento"
      subtitle={event.title}
      icon={<Pencil className="h-5 w-5" />}
      size="2xl"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Guardar cambios"
          confirmLoading={saving}
          confirmDisabled={!form.title.trim()}
          extra={
            onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                Eliminar evento
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="space-y-6">
        <EventFormFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} showStatus />
        {loadingTasks ? (
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ) : (
          <EventLinkedTasksSection tasks={linkedTasks} onChange={setLinkedTasks} />
        )}
      </div>
    </PlannerDialog>
  )
}
