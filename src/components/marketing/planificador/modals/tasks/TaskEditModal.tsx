'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { TaskFormFields, type TaskFormState } from '@/components/marketing/planificador/modals/tasks/TaskFormFields'
import { formToTaskInput, taskToForm } from '@/components/marketing/planificador/modals/tasks/task-form-utils'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type { PlannerTask } from '@/types/marketing-planner'
import type { PlannerTaskInput } from '@/hooks/marketing/usePlannerTasks'

type Props = {
  open: boolean
  onClose: () => void
  task: PlannerTask
  onSave: (input: PlannerTaskInput) => Promise<{ error?: string }>
  onDelete?: () => void
}

export function TaskEditModal({ open, onClose, task, onSave, onDelete }: Props) {
  const { isAdmin } = useMarketingPlannerContext()
  const [form, setForm] = useState<TaskFormState>(() => taskToForm(task))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(taskToForm(task))
  }, [open, task])

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await onSave(formToTaskInput(form, isAdmin, { parent_id: task.parent_id }))
    setSaving(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title="Editar tarea"
      subtitle={task.title}
      icon={<Pencil className="h-5 w-5" />}
      size="lg"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Guardar"
          confirmLoading={saving}
          confirmDisabled={!form.title.trim()}
          extra={
            onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Eliminar
              </button>
            ) : undefined
          }
        />
      }
    >
      <TaskFormFields
        value={form}
        onChange={(p) => setForm((f) => ({ ...f, ...p }))}
        showStatus={task.status !== 'completed'}
      />
    </PlannerDialog>
  )
}
