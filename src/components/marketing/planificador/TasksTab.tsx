'use client'

import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { usePlannerTasks, type PlannerTaskInput } from '@/hooks/marketing/usePlannerTasks'
import type { PlannerTask } from '@/types/marketing-planner'
import { PlannerVisibilityBadge } from '@/components/marketing/planificador/PlannerVisibilityBadge'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { LinkedEventBadge } from '@/components/marketing/planificador/ui/LinkedEventBadge'
import { PlannerConfirmDialog } from '@/components/marketing/planificador/ui/PlannerConfirmDialog'
import { TaskCreateModal } from '@/components/marketing/planificador/modals/tasks/TaskCreateModal'
import { TaskEditModal } from '@/components/marketing/planificador/modals/tasks/TaskEditModal'
import { TaskViewModal } from '@/components/marketing/planificador/modals/tasks/TaskViewModal'
import { TaskCompleteModal } from '@/components/marketing/planificador/modals/tasks/TaskCompleteModal'
import { formatEcuador } from '@/lib/marketing-planner/timezone'

const PRIORITY_COLORS = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-amber-100 text-amber-800',
  alta: 'bg-red-100 text-red-700',
}

export function TasksTab() {
  const {
    tasks,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    stats,
    createTask,
    updateTask,
    completeTaskWithProof,
    reopenTask,
    getProofSignedUrl,
    deleteTask,
  } = usePlannerTasks()

  const [createOpen, setCreateOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [viewTask, setViewTask] = useState<PlannerTask | null>(null)
  const [editTask, setEditTask] = useState<PlannerTask | null>(null)
  const [completeTask, setCompleteTask] = useState<PlannerTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannerTask | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState(false)

  function openCreate(pid?: string) {
    setCreateParentId(pid ?? null)
    setCreateOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteTask(deleteTarget.id)
    setDeleting(false)
    if (error) toast.error(error)
    else {
      toast.success('Tarea eliminada')
      setDeleteTarget(null)
      setEditTask(null)
      setViewTask(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['pending', 'Pendientes', stats.pending],
              ['overdue', 'Vencidas', stats.overdue],
              ['completed', 'Completadas', stats.completed],
              ['all', 'Todas', stats.total],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={[
                'px-4 py-2 rounded-xl text-sm font-semibold',
                filter === id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600',
              ].join(' ')}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tareas…"
              className="pl-9 w-48 rounded-xl border-slate-200 h-10"
            />
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nueva tarea
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando…</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No hay tareas en este filtro</div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expanded[task.id] ?? true}
              onToggleExpand={() =>
                setExpanded((e) => ({ ...e, [task.id]: !(e[task.id] ?? true) }))
              }
              onManage={() => setViewTask(task)}
              onComplete={() => setCompleteTask(task)}
              onDelete={() => setDeleteTarget(task)}
              onAddSub={() => openCreate(task.id)}
            />
          ))
        )}
      </div>

      <TaskCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        parentId={createParentId}
        onSave={async (input) => {
          const res = await createTask(input)
          if (res.error) toast.error(res.error)
          else toast.success('Tarea creada')
          return res
        }}
      />

      {viewTask && (
        <TaskViewModal
          open={!!viewTask}
          onClose={() => setViewTask(null)}
          task={viewTask}
          getProofSignedUrl={getProofSignedUrl}
          onEdit={() => {
            setEditTask(viewTask)
            setViewTask(null)
          }}
          onComplete={() => {
            setCompleteTask(viewTask)
            setViewTask(null)
          }}
          onReopen={
            viewTask.status === 'completed'
              ? async () => {
                  const { error } = await reopenTask(viewTask.id)
                  if (error) toast.error(error)
                  else {
                    toast.success('Tarea reabierta')
                    setViewTask(null)
                  }
                }
              : undefined
          }
        />
      )}

      {editTask && (
        <TaskEditModal
          open={!!editTask}
          onClose={() => setEditTask(null)}
          task={editTask}
          onSave={async (input) => {
            const res = await updateTask(editTask.id, input)
            if (res.error) toast.error(res.error)
            else toast.success('Tarea actualizada')
            return res
          }}
          onDelete={() => setDeleteTarget(editTask)}
        />
      )}

      {completeTask && (
        <TaskCompleteModal
          open={!!completeTask}
          onClose={() => setCompleteTask(null)}
          task={completeTask}
          onSubmit={async (proof) => {
            const res = await completeTaskWithProof(completeTask.id, proof)
            if (res.error) toast.error(res.error)
            else toast.success('Tarea completada con evidencia')
            return res
          }}
        />
      )}

      <PlannerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? Las subtareas también se eliminarán."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  )
}

function TaskRow({
  task,
  expanded,
  onToggleExpand,
  onManage,
  onComplete,
  onDelete,
  onAddSub,
}: {
  task: PlannerTask & { subtasks?: PlannerTask[] }
  expanded: boolean
  onToggleExpand: () => void
  onManage: () => void
  onComplete: () => void
  onDelete: () => void
  onAddSub: () => void
}) {
  const done = task.status === 'completed'
  const pending = !done && task.status !== 'cancelled'
  const subs = task.subtasks ?? []
  const hasProof = done && !!task.completion_note

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={pending ? onComplete : onManage}
          title={pending ? 'Completar con evidencia' : 'Ver tarea'}
          className={[
            'mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
            done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-violet-400',
          ].join(' ')}
        >
          {done && <Check className="h-3 w-3" />}
        </button>
        {subs.length > 0 && (
          <button type="button" onClick={onToggleExpand} className="mt-0.5 text-slate-400">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <button type="button" onClick={onManage} className="text-left w-full">
            <p className={`font-semibold text-slate-900 ${done ? 'text-slate-600' : ''}`}>{task.title}</p>
          </button>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <LinkedEventBadge task={task} />
            <OwnerBadge owner={task.owner} creator={task.creator} showCreatorIfDifferent />
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            <PlannerVisibilityBadge visibility={task.visibility} />
            {hasProof && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <FileCheck className="h-3 w-3" />
                Con evidencia
              </span>
            )}
            {task.due_at && (
              <span className="text-xs font-semibold text-amber-700">{formatEcuador(task.due_at, 'd MMM')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {pending && (
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
              title="Completar con evidencia"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completar
            </button>
          )}
          <button
            type="button"
            onClick={onManage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Gestionar
          </button>
          <button type="button" onClick={onAddSub} className="p-2 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50" title="Subtarea">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded &&
        subs.map((st) => (
          <div key={st.id} className="ml-12 mt-3 flex items-center gap-3 border-l-2 border-violet-100 pl-3">
            <span className={`text-sm flex-1 ${st.status === 'completed' ? 'text-slate-400' : 'text-slate-700'}`}>
              {st.title}
            </span>
            <OwnerBadge owner={st.owner} />
          </div>
        ))}
    </div>
  )
}
