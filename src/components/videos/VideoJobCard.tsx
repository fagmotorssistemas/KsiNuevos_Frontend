'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Play,
  Download,
  ExternalLink,
  Film,
  Layers,
  Trash2,
  Loader2,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import type { VideoJob, VideoJobStatus } from '@/lib/videos/types'
import { resolveSocialPublishStage } from '@/lib/videos/publish-flow'
import { resolveJobVehicleLabel } from '@/lib/videos/resolve-job-vehicle'
import { resolveJobPlaybackUrl } from '@/lib/videos/resolve-job-playback-url'
import { useVideoDownload } from '@/hooks/videos/useVideoDownload'

const STATUS_CHIP: Record<VideoJobStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
  uploading: { label: 'Subiendo', className: 'bg-blue-50 text-blue-800' },
  transcribing: { label: 'Transcribiendo', className: 'bg-yellow-50 text-yellow-800' },
  analyzing: { label: 'Analizando', className: 'bg-orange-50 text-orange-800' },
  rendering: { label: 'Renderizando', className: 'bg-violet-50 text-violet-800' },
  completed: { label: 'Completado', className: 'bg-emerald-50 text-emerald-800' },
  failed: { label: 'Error', className: 'bg-red-50 text-red-800' },
}

const SOCIAL_CHIP: Record<string, { label: string; className: string }> = {
  generado: { label: 'Listo (redes)', className: 'bg-slate-100 text-slate-700' },
  aprobado: { label: 'Aprobado', className: 'bg-emerald-50 text-emerald-800' },
  programado: { label: 'Programado', className: 'bg-sky-50 text-sky-800' },
  publicado: { label: 'Publicado', className: 'bg-green-50 text-green-800' },
  fallido: { label: 'Fallido (redes)', className: 'bg-red-50 text-red-800' },
}

function formatUploadDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

interface VideoJobCardProps {
  job: VideoJob
  featuring?: boolean
  onToggleFeatured: () => void
  onJobDeleted: (jobId: string) => void
}

export function VideoJobCard({
  job,
  featuring = false,
  onToggleFeatured,
  onJobDeleted,
}: VideoJobCardProps) {
  const isProcessing = !['completed', 'failed'].includes(job.status)
  const featured = Boolean(job.is_featured)
  const statusChip = STATUS_CHIP[job.status]
  const socialStage = job.status === 'completed' ? resolveSocialPublishStage(job) : null
  const socialChip = socialStage ? SOCIAL_CHIP[socialStage] : null
  const inventoryJoin = job.inventory_vehicle
  const vehicleLabel = resolveJobVehicleLabel(
    {
      id: job.id,
      job_name: job.job_name ?? null,
      vehicle_line_1: job.vehicle_line_1,
      vehicle_line_2: job.vehicle_line_2 ?? null,
      vehicle_line_4: job.vehicle_line_4,
      inventory_vehicle_id: job.inventory_vehicle_id,
      selected_clips: job.selected_clips,
      video_script_id: null,
      created_at: job.created_at,
    },
    inventoryJoin
      ? {
          id: inventoryJoin.id,
          brand: inventoryJoin.brand,
          model: inventoryJoin.model,
          year: inventoryJoin.year,
          plate: inventoryJoin.plate ?? null,
          status: null,
        }
      : null
  )
  const plate = inventoryJoin?.plate?.trim() || null
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isDownloading, download } = useVideoDownload()
  const playbackUrl = resolveJobPlaybackUrl(job.id, job.final_video_url)
  const durationLabel =
    job.final_video_duration != null ? `${Math.round(job.final_video_duration)}s` : null
  const clipsLabel =
    job.flow_type === 'single' ? '1 video largo' : `${job.raw_video_paths.length} clips`

  async function handleDeleteJob() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/videos/jobs/${job.id}`, { method: 'DELETE' })
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

  function handleDownload() {
    if (!playbackUrl) return
    void download({
      url: playbackUrl,
      jobId: job.id,
      filename: vehicleLabel.title,
    })
  }

  return (
    <>
      <article
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
          featured
            ? 'border-amber-300 ring-2 ring-amber-200 hover:border-amber-400'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <div className="relative aspect-video bg-slate-950">
          {playbackUrl ? (
            <video
              src={`${playbackUrl}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              {isProcessing ? (
                <>
                  <div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-400">{job.progress_percentage}%</span>
                </>
              ) : (
                <Film className="h-8 w-8 text-slate-500" />
              )}
            </div>
          )}
          {playbackUrl ? (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/35"
              title="Previsualizar"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                <Play className="ml-0.5 h-5 w-5 fill-slate-900 text-slate-900" />
              </span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={featuring}
            onClick={onToggleFeatured}
            className={`absolute right-2 top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition disabled:opacity-50 ${
              featured
                ? 'border-amber-300 bg-amber-400 text-white hover:bg-amber-500'
                : 'border-white/40 bg-black/55 text-white hover:bg-black/75'
            }`}
            title={featured ? 'Quitar destacado' : 'Destacar este video (solo uno)'}
          >
            {featuring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className={`h-4 w-4 ${featured ? 'fill-white' : ''}`} />
            )}
          </button>
          {durationLabel ? (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
              {durationLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {featured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Destacado
              </span>
            ) : null}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusChip.className}`}
            >
              {statusChip.label}
            </span>
            {socialChip ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${socialChip.className}`}
              >
                {socialChip.label}
              </span>
            ) : null}
            {plate ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-600">
                {plate}
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
              {vehicleLabel.title}
            </h2>
            {vehicleLabel.subtitle ? (
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{vehicleLabel.subtitle}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">Subido {formatUploadDay(job.created_at)}</p>
          </div>

          {isProcessing ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${job.progress_percentage}%` }}
              />
            </div>
          ) : null}

          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            {job.flow_type === 'single' ? (
              <Film className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Layers className="h-3.5 w-3.5 shrink-0" />
            )}
            {clipsLabel}
          </p>

          <div className="mt-auto flex items-center gap-2 pt-1">
            <Link
              href={`/marketing/videos/${job.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              <ExternalLink className="h-4 w-4" />
              Ver detalle
            </Link>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!playbackUrl || isDownloading}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
              title={isDownloading ? 'Cargando…' : 'Descargar'}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>

      {isPreviewOpen && playbackUrl ? (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold"
            >
              Cerrar
            </button>
            <video
              src={playbackUrl}
              className="w-full max-h-[80vh]"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
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
      ) : null}
    </>
  )
}
