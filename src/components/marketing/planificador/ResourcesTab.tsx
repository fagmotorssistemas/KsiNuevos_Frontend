'use client'

import { useRef, useState } from 'react'
import { Download, FileText, Image as ImageIcon, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { usePlannerResources } from '@/hooks/marketing/usePlannerResources'
import type { PlannerResource, PlannerResourceCategory } from '@/types/marketing-planner'
import { PlannerVisibilityBadge } from '@/components/marketing/planificador/PlannerVisibilityBadge'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { PlannerConfirmDialog } from '@/components/marketing/planificador/ui/PlannerConfirmDialog'
import { ResourceUploadModal } from '@/components/marketing/planificador/modals/resources/ResourceUploadModal'
import { formatEcuador } from '@/lib/marketing-planner/timezone'

const CATEGORIES: { id: PlannerResourceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'document', label: 'Documentos' },
  { id: 'image', label: 'Imágenes' },
  { id: 'video', label: 'Videos' },
  { id: 'brand', label: 'Marca' },
  { id: 'template', label: 'Plantillas' },
  { id: 'other', label: 'Otros' },
]

export function ResourcesTab() {
  const {
    resources,
    loading,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    uploadResource,
    deleteResource,
    getSignedUrl,
  } = usePlannerResources()

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannerResource | null>(null)
  const [deleting, setDeleting] = useState(false)

  function onFilePick(files: FileList | null) {
    if (!files?.[0]) return
    if (files[0].size > 52_428_800) {
      toast.error('El archivo supera 50 MB')
      return
    }
    setPendingFile(files[0])
    setUploadOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteResource(deleteTarget)
    setDeleting(false)
    if (error) toast.error(error)
    else {
      toast.success('Recurso eliminado')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={[
                'px-3 py-2 rounded-xl text-sm font-semibold',
                categoryFilter === c.id ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar recursos…"
              className="pl-9 w-48 rounded-xl border-slate-200 h-10"
            />
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFilePick(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            Subir archivo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aún no hay recursos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onDownload={async () => {
                const url = await getSignedUrl(r.file_path)
                if (!url) toast.error('No se pudo generar enlace')
                else window.open(url, '_blank')
              }}
              onDelete={() => setDeleteTarget(r)}
            />
          ))}
        </div>
      )}

      <ResourceUploadModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setPendingFile(null)
        }}
        initialFile={pendingFile}
        onUpload={async (file, meta) => {
          const res = await uploadResource(file, meta)
          if (res.error) toast.error(res.error)
          else toast.success('Recurso subido')
          return res
        }}
      />

      <PlannerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar recurso"
        message={`¿Eliminar "${deleteTarget?.title}" del repositorio?`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  )
}

function ResourceCard({
  resource,
  onDownload,
  onDelete,
}: {
  resource: PlannerResource
  onDownload: () => void
  onDelete: () => void
}) {
  const isImage = resource.mime_type?.startsWith('image/')
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
          {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{resource.title}</p>
          <p className="text-xs text-slate-400 truncate">{resource.file_name}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <OwnerBadge owner={resource.owner} creator={resource.creator} showCreatorIfDifferent />
            <PlannerVisibilityBadge visibility={resource.visibility} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{formatEcuador(resource.created_at, 'd MMM yyyy')}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Descargar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-xl border border-slate-200 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
