'use client'

import { CheckCircle2, ClipboardList, Pencil, RotateCcw } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { PlannerVisibilityBadge } from '@/components/marketing/planificador/PlannerVisibilityBadge'
import { TaskCompletionProofBlock } from '@/components/marketing/planificador/modals/tasks/TaskCompletionProofBlock'
import { LinkedEventBadge } from '@/components/marketing/planificador/ui/LinkedEventBadge'
import type { PlannerTask } from '@/types/marketing-planner'
import { formatEcuador } from '@/lib/marketing-planner/timezone'

const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' }

type Props = {
  open: boolean
  onClose: () => void
  task: PlannerTask
  onEdit: () => void
  onComplete: () => void
  onReopen?: () => void
  getProofSignedUrl: (path: string) => Promise<string | null>
}

export function TaskViewModal({
  open,
  onClose,
  task,
  onEdit,
  onComplete,
  onReopen,
  getProofSignedUrl,
}: Props) {
  const done = task.status === 'completed'
  const pending = task.status === 'pending' || task.status === 'in_progress'

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={task.title}
      subtitle={task.category}
      icon={<ClipboardList className="h-5 w-5" />}
      size="lg"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={pending ? onComplete : onEdit}
          cancelLabel="Cerrar"
          confirmLabel={pending ? 'Marcar completada' : 'Editar'}
          extra={
            done && onReopen ? (
              <button
                type="button"
                onClick={onReopen}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="h-4 w-4" />
                Reabrir
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <LinkedEventBadge task={task} />
          <OwnerBadge owner={task.owner} creator={task.creator} showCreatorIfDifferent />
          <PlannerVisibilityBadge visibility={task.visibility} />
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {PRIORITY_LABELS[task.priority]}
          </span>
          {done && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              Completada
            </span>
          )}
        </div>

        {task.description && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Instrucciones</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {task.due_at && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Vence:</span> {formatEcuador(task.due_at, "EEEE d MMM · HH:mm")}
          </p>
        )}

        <TaskCompletionProofBlock task={task} getProofSignedUrl={getProofSignedUrl} />

        {pending && (
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Completar con evidencia
          </button>
        )}
      </div>
    </PlannerDialog>
  )
}
