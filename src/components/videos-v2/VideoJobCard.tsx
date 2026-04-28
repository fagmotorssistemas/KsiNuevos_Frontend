'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Download, ExternalLink, Clock, Film, Layers, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { VideoJobV2, VideoJobStatus } from '@/lib/videos-v2/types'

const STATUS_CONFIG: Record<VideoJobStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600' },
  uploading: { label: 'Subiendo', className: 'bg-blue-100 text-blue-700' },
  transcribing: { label: 'Transcribiendo', className: 'bg-yellow-100 text-yellow-700' },
  analyzing: { label: 'Analizando', className: 'bg-orange-100 text-orange-700' },
  rendering: { label: 'Renderizando', className: 'bg-violet-100 text-violet-700' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Error', className: 'bg-red-100 text-red-700' },
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

interface VideoJobCardProps {
  job: VideoJobV2
  onJobDeleted: (jobId: string) => void
}

export function VideoJobCard({ job, onJobDeleted }: VideoJobCardProps) {
  const isProcessing = !['completed', 'failed'].includes(job.status)
  const cfg = STATUS_CONFIG[job.status]
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDeleteJob() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${job.id}`, { method: 'DELETE' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar el job')
      onJobDeleted(job.id)
      toast.success('Job eliminado')
    } catch (error) {
      console.error('[VideoJobCard] delete:', error)
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el job')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  async function handleDownload() {
    if (!job.final_video_url) return
    setIsDownloading(true)
    try {
      const res = await fetch(job.final_video_url)
      if (!res.ok) throw new Error(`No se pudo descargar (HTTP ${res.status})`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filename = `${job.job_name?.trim() || `video-job-${job.id.slice(0, 8)}`}.mp4`
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('[VideoJobCard] download:', error)
      window.open(job.final_video_url, '_blank', 'noopener,noreferrer')
      toast.error('No se pudo forzar descarga directa. Se abrió el video en otra pestaña.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
        {/* Miniatura / Preview */}
        <div className="relative h-52 bg-gray-900 flex items-center justify-center overflow-hidden">
          {job.final_video_url ? (
            <video
              src={`${job.final_video_url}#t=0.1`}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {isProcessing ? (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-400">{job.progress_percentage}%</span>
                </>
              ) : (
                <Film className="w-10 h-10 text-gray-600" />
              )}
            </div>
          )}

          {/* Badge de estado */}
          <div className="absolute top-2 left-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>

          {job.final_video_url && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"
              title="Previsualizar video"
            >
              <span className="w-12 h-12 rounded-full bg-white/90 text-violet-700 flex items-center justify-center shadow-md">
                <Play className="w-5 h-5 ml-0.5" />
              </span>
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-semibold text-gray-800 truncate">
            {job.job_name?.trim() || `Job ${job.id.slice(0, 8)}`}
          </div>

          {/* Progreso si está procesando */}
          {isProcessing && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${job.progress_percentage}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDate(job.created_at)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            {job.flow_type === 'single' ? (
              <Film className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Layers className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{job.flow_type === 'single' ? '1 video largo' : `${job.raw_video_paths.length} clips`}</span>
            {job.final_video_duration && (
              <span className="ml-auto font-semibold text-gray-700">{Math.round(job.final_video_duration)}s</span>
            )}
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto] gap-2 pt-1">
            <Link
              href={`/marketing/videos-v2/${job.id}`}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver detalle
            </Link>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!job.final_video_url || isDownloading}
              className="flex items-center justify-center w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-50"
              title="Descargar"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors"
              title="Eliminar job"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isPreviewOpen && job.final_video_url && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <video
              src={job.final_video_url}
              className="w-full h-auto max-h-[80vh] bg-black"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Eliminar job</h3>
            <p className="text-sm text-gray-600 mt-2">
              ¿Seguro que deseas eliminar este job? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteJob()}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
