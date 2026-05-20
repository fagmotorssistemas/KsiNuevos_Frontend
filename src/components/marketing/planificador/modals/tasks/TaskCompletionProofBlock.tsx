'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileCheck, Link2 } from 'lucide-react'
import type { PlannerTask } from '@/types/marketing-planner'
import { formatEcuador } from '@/lib/marketing-planner/timezone'

type Props = {
  task: PlannerTask
  getProofSignedUrl: (path: string) => Promise<string | null>
}

export function TaskCompletionProofBlock({ task, getProofSignedUrl }: Props) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!task.completion_proof_file_path) {
      setFileUrl(null)
      return
    }
    void getProofSignedUrl(task.completion_proof_file_path).then(setFileUrl)
  }, [task.completion_proof_file_path, getProofSignedUrl])

  if (task.status !== 'completed' || !task.completion_note) return null

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800">
        <FileCheck className="h-4 w-4" />
        <p className="text-xs font-bold uppercase tracking-wide">Evidencia de completado</p>
      </div>
      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{task.completion_note}</p>
      {task.completion_proof_url && (
        <a
          href={task.completion_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline"
        >
          <Link2 className="h-4 w-4" />
          Ver enlace adjunto
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline"
        >
          <FileCheck className="h-4 w-4" />
          Descargar archivo de evidencia
        </a>
      )}
      {task.completed_at && (
        <p className="text-xs text-slate-500">
          Completada {formatEcuador(task.completed_at, "d MMM yyyy · HH:mm")}
          {task.completer?.full_name ? ` · por ${task.completer.full_name}` : ''}
        </p>
      )}
    </div>
  )
}
