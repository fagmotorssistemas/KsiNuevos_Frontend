'use client'

import { useEffect, useState } from 'react'
import { ListPlus } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { TaskFormFields, type TaskFormState } from '@/components/marketing/planificador/modals/tasks/TaskFormFields'
import { emptyTaskForm, formToTaskInput } from '@/components/marketing/planificador/modals/tasks/task-form-utils'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerTaskInput } from '@/hooks/marketing/usePlannerTasks'

type Props = {
  open: boolean
  onClose: () => void
  parentId?: string | null
  onSave: (input: PlannerTaskInput) => Promise<{ error?: string }>
}

export function TaskCreateModal({ open, onClose, parentId, onSave }: Props) {
  const { isAdmin, effectiveOwnerId } = useMarketingPlannerContext()
  const [form, setForm] = useState<TaskFormState>(() => emptyTaskForm(effectiveOwnerId ?? undefined))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(emptyTaskForm(effectiveOwnerId ?? undefined))
  }, [open, effectiveOwnerId])

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await onSave(
      formToTaskInput(form, isAdmin, { parent_id: parentId ?? null, status: 'pending' }),
    )
    setSaving(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={parentId ? 'Nueva subtarea' : 'Nueva tarea'}
      subtitle="Define qué hay que hacer y para cuándo"
      icon={<ListPlus className="h-5 w-5" />}
      size="lg"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Crear tarea"
          confirmLoading={saving}
          confirmDisabled={!form.title.trim()}
        />
      }
    >
      <TaskFormFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
    </PlannerDialog>
  )
}
