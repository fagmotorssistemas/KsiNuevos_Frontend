import type { PlannerTask } from '@/types/marketing-planner'
import type { PlannerTaskInput } from '@/hooks/marketing/usePlannerTasks'
import { ecuadorLocalInputToIso, toEcuadorLocalInputValue } from '@/lib/marketing-planner/timezone'
import type { TaskFormState } from '@/components/marketing/planificador/modals/tasks/TaskFormFields'

export function emptyTaskForm(ownerId?: string, parentId?: string | null): TaskFormState {
  return {
    title: '',
    description: '',
    priority: 'media',
    dueLocal: '',
    category: 'general',
    visibility: 'personal',
    status: 'pending',
    ownerId: ownerId ?? '',
  }
}

export function taskToForm(task: PlannerTask): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueLocal: task.due_at ? toEcuadorLocalInputValue(task.due_at) : '',
    category: task.category,
    visibility: task.visibility,
    status: task.status,
    ownerId: task.owner_id,
  }
}

export function formToTaskInput(
  form: TaskFormState,
  isAdmin: boolean,
  extras?: Partial<PlannerTaskInput>,
): PlannerTaskInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    due_at: form.dueLocal ? ecuadorLocalInputToIso(form.dueLocal) : null,
    category: form.category,
    visibility: form.visibility,
    status: form.status,
    owner_id: isAdmin && form.ownerId ? form.ownerId : undefined,
    ...extras,
  }
}
