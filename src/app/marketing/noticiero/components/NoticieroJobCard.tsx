'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, ExternalLink, Clock, Newspaper, Trash2, X, Megaphone, RefreshCw } from 'lucide-react'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import { toast } from 'sonner'
import type { NoticieroJob, NoticieroJobStatus } from '@/lib/noticiero/types'
import { canApproveNoticieroForPublish, resolveNoticieroSocialStage } from '@/lib/noticiero/publish-flow'

const STATUS_CONFIG: Record<NoticieroJobStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600' },
  script: { label: 'Guión', className: 'bg-yellow-100 text-yellow-700' },
  avatar: { label: 'Avatar', className: 'bg-violet-100 text-violet-700' },
  compositing: { label: 'Componiendo', className: 'bg-violet-100 text-violet-700' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Error', className: 'bg-red-100 text-red-700' },
}

const SOCIAL_STAGE_BADGE: Record<string, { label: string; className: string }> = {
  generado: { label: 'Listo para aprobar', className: 'bg-slate-700/90 text-white' },
  aprobado: { label: 'Aprobado', className: 'bg-emerald-700/90 text-white' },
  programado: { label: 'Programado', className: 'bg-sky-700/90 text-white' },
  publicado: { label: 'Publicado', className: 'bg-green-800/90 text-white' },
  fallido: { label: 'Fallido (redes)', className: 'bg-red-800/90 text-white' },
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateStr))
}

function canResumeCompositing(job: NoticieroJob): boolean {
  return (
    job.status === 'compositing' &&
    Boolean(job.heygen_video_url?.trim()) &&
    !job.final_video_url?.trim()
  )
}

interface NoticieroJobCardProps {
  job: NoticieroJob
  onJobDeleted: (jobId: string) => void
  onApproved?: () => void
  onJobUpdated?: () => void
}

export function NoticieroJobCard({ job, onJobDeleted, onApproved, onJobUpdated }: NoticieroJobCardProps) {
  const isProcessing = !['completed', 'failed'].includes(job.status)
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending
  const socialStage = resolveNoticieroSocialStage(job) || null
  const socialBadge = socialStage ? SOCIAL_STAGE_BADGE[socialStage] : null
  const canApprove = canApproveNoticieroForPublish(job)
  const showResume = canResumeCompositing(job)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  async function handleApprove() {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_publish_stage: 'aprobado' }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo aprobar')
      toast.success('Noticiero aprobado. Programa la publicación en la pestaña Publicación.')
      onApproved?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleResumeVideo() {
    setIsResuming(true)
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${job.id}/resume-video`, {
        method: 'POST',
      })
      const data = await parseJsonOrThrow<{ error?: string; message?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'No se pudo reanudar')
      toast.success(
        data.message ?? 'Composición reanudada en el servidor. El listado se actualizará en breve.'
      )
      onJobUpdated?.()
      setTimeout(() => onJobUpdated?.(), 5000)
      setTimeout(() => onJobUpdated?.(), 15000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al reanudar')
    } finally {
      setIsResuming(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${job.id}`, { method: 'DELETE' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar')
      onJobDeleted(job.id)
      toast.success('Noticiero eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative h-52 bg-gray-900 flex items-center justify-center overflow-hidden">
          {job.final_video_url ? (
            <video
              src={`${job.final_video_url}#t=0.1`}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {isProcessing ? (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-400">{job.progress_percentage ?? 0}%</span>
                </>
              ) : (
                <Newspaper className="w-10 h-10 text-gray-600" />
              )}
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
              {cfg.label}
            </span>
            {socialBadge ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${socialBadge.className}`}>
                {socialBadge.label}
              </span>
            ) : null}
          </div>

          {job.final_video_url && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"
            >
              <span className="w-12 h-12 rounded-full bg-white/90 text-violet-700 flex items-center justify-center shadow-md">
                <Play className="w-5 h-5 ml-0.5" />
              </span>
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900 truncate">
            {job.job_name?.trim() || `Noticiero ${job.id.slice(0, 8)}`}
          </p>

          {isProcessing && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${job.progress_percentage ?? 0}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(job.created_at)}</span>
          </div>

          {showResume && (
            <button
              type="button"
              disabled={isResuming}
              onClick={() => void handleResumeVideo()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isResuming ? 'animate-spin' : ''}`} />
              {isResuming ? 'Componiendo video…' : 'Reanudar composición'}
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => void handleApprove()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60"
            >
              <Megaphone className="w-4 h-4" />
              {isApproving ? 'Aprobando...' : 'Aprobar para publicar'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/marketing/noticiero/${job.id}`}
              className="flex items-center justify-center h-9 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center justify-center h-9 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isPreviewOpen && job.final_video_url && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <video src={job.final_video_url} controls autoPlay playsInline className="w-full max-h-[80vh]" />
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900">Eliminar noticiero</h3>
            <p className="text-sm text-gray-600 mt-2">Esta acción no se puede deshacer.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 text-sm rounded-xl bg-gray-100">
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
