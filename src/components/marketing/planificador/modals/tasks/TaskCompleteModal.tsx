'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Upload } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter, PlannerInput, PlannerTextarea } from '@/components/marketing/planificador/ui/PlannerForm'
import type { PlannerTask, TaskCompletionProof } from '@/types/marketing-planner'

type Props = {
  open: boolean
  onClose: () => void
  task: PlannerTask
  onSubmit: (proof: TaskCompletionProof) => Promise<{ error?: string }>
}

export function TaskCompleteModal({ open, onClose, task, onSubmit }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setNote('')
    setUrl('')
    setFile(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function submit() {
    if (!note.trim()) return
    setSaving(true)
    const res = await onSubmit({
      completion_note: note,
      completion_proof_url: url.trim() || null,
      completion_proof_file: file,
    })
    setSaving(false)
    if (!res.error) {
      reset()
      onClose()
    }
  }

  return (
    <PlannerDialog
      open={open}
      onClose={handleClose}
      title="Completar tarea"
      subtitle={task.title}
      icon={<CheckCircle2 className="h-5 w-5" />}
      size="lg"
      footer={
        <PlannerModalFooter
          onCancel={handleClose}
          onConfirm={() => void submit()}
          confirmLabel="Confirmar completado"
          confirmLoading={saving}
          confirmDisabled={!note.trim()}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Indica <strong>cómo</strong> completaste esta tarea: enlaces a publicaciones, descripción de
          entregables impresos, capturas subidas, etc.
        </p>

        <PlannerTextarea
          label="Descripción del completado"
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Subí el video a Instagram y Facebook. Enlace en la URL de abajo. Todas las fichas del lote fueron impresas."
          rows={4}
        />

        <PlannerInput
          label="Enlace de evidencia"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (video, drive, post, etc.)"
          hint="Opcional pero recomendado"
        />

        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Archivo adjunto (opcional)
          </p>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-600 hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : 'Seleccionar archivo (máx. 50 MB)'}
          </button>
        </div>
      </div>
    </PlannerDialog>
  )
}
