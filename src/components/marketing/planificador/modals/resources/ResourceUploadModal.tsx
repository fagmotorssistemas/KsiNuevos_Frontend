'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import {
  PlannerModalFooter,
  PlannerInput,
  PlannerSelect,
  PlannerTextarea,
} from '@/components/marketing/planificador/ui/PlannerForm'
import type { PlannerResourceCategory, PlannerVisibility } from '@/types/marketing-planner'
import type { PlannerResourceInput } from '@/hooks/marketing/usePlannerResources'

const CATEGORIES: { value: PlannerResourceCategory; label: string }[] = [
  { value: 'document', label: 'Documento' },
  { value: 'image', label: 'Imagen' },
  { value: 'video', label: 'Video' },
  { value: 'brand', label: 'Marca' },
  { value: 'template', label: 'Plantilla' },
  { value: 'other', label: 'Otro' },
]

type Props = {
  open: boolean
  onClose: () => void
  initialFile?: File | null
  onUpload: (file: File, meta: PlannerResourceInput) => Promise<{ error?: string }>
}

export function ResourceUploadModal({ open, onClose, initialFile, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(initialFile ?? null)
  const [title, setTitle] = useState(initialFile?.name.replace(/\.[^.]+$/, '') ?? '')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<PlannerResourceCategory>('document')
  const [visibility, setVisibility] = useState<PlannerVisibility>('personal')
  const [uploading, setUploading] = useState(false)

  function pick(f: FileList | null) {
    const picked = f?.[0]
    if (!picked) return
    if (picked.size > 52_428_800) return
    setFile(picked)
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''))
  }

  async function submit() {
    if (!file) return
    setUploading(true)
    const res = await onUpload(file, {
      title: title.trim() || file.name,
      description: description.trim() || null,
      category,
      visibility,
    })
    setUploading(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title="Subir recurso"
      subtitle="PDF, imágenes, plantillas para el equipo"
      icon={<Upload className="h-5 w-5" />}
      size="lg"
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel="Subir"
          confirmLoading={uploading}
          confirmDisabled={!file || !title.trim()}
        />
      }
    >
      <div className="space-y-4">
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => pick(e.target.files)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-300 text-sm font-semibold text-slate-600"
        >
          {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Elegir archivo'}
        </button>

        <PlannerInput label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <PlannerTextarea
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-4">
          <PlannerSelect
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value as PlannerResourceCategory)}
            options={CATEGORIES}
          />
          <PlannerSelect
            label="Visibilidad"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PlannerVisibility)}
            options={[
              { value: 'personal', label: 'Personal' },
              { value: 'team', label: 'Equipo' },
            ]}
          />
        </div>
      </div>
    </PlannerDialog>
  )
}
