'use client'

import { ListPlus, Plus, Trash2 } from 'lucide-react'
import type { DraftLinkedTask, PlannerPriority } from '@/types/marketing-planner'
import { PlannerInput, PlannerSelect } from '@/components/marketing/planificador/ui/PlannerForm'

function newDraft(): DraftLinkedTask {
  return {
    localId: crypto.randomUUID(),
    title: '',
    priority: 'media',
  }
}

type Props = {
  tasks: DraftLinkedTask[]
  onChange: (tasks: DraftLinkedTask[]) => void
}

export function EventLinkedTasksSection({ tasks, onChange }: Props) {
  function update(localId: string, patch: Partial<DraftLinkedTask>) {
    onChange(tasks.map((t) => (t.localId === localId ? { ...t, ...patch } : t)))
  }

  function remove(localId: string) {
    onChange(tasks.filter((t) => t.localId !== localId))
  }

  function add() {
    onChange([...tasks, newDraft()])
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
            <ListPlus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Tareas del evento</p>
            <p className="text-xs text-slate-500">
              Se crearán en la pestaña Tareas y quedarán vinculadas a este evento.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-xs font-bold text-violet-700 hover:bg-violet-50 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-3 border border-dashed border-violet-200 rounded-xl bg-white/60">
          Sin tareas aún. Ej: &quot;Subir fotos del vehículo&quot;, &quot;Imprimir fichas&quot;…
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t, index) => (
            <li
              key={t.localId}
              className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-white border border-slate-200/80"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase pt-2.5 sm:w-6 shrink-0">
                {index + 1}
              </span>
              <PlannerInput
                value={t.title}
                onChange={(e) => update(t.localId, { title: e.target.value })}
                placeholder="Descripción de la tarea…"
                className="flex-1 h-10"
              />
              <PlannerSelect
                value={t.priority}
                onChange={(e) => update(t.localId, { priority: e.target.value as PlannerPriority })}
                options={[
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                ]}
                className="sm:w-28"
              />
              <button
                type="button"
                onClick={() => remove(t.localId)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 self-center"
                aria-label="Quitar tarea"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function draftsFromTasks(tasks: { id: string; title: string; priority: PlannerPriority }[]): DraftLinkedTask[] {
  return tasks.map((t) => ({
    localId: t.id,
    dbId: t.id,
    title: t.title,
    priority: t.priority,
  }))
}
