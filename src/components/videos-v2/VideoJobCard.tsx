'use client'

import Link from 'next/link'
import { Play, Download, ExternalLink, Clock, Film, Layers } from 'lucide-react'
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
}

export function VideoJobCard({ job }: VideoJobCardProps) {
  const isProcessing = !['completed', 'failed'].includes(job.status)
  const cfg = STATUS_CONFIG[job.status]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Miniatura / Preview */}
      <div className="relative aspect-[9/16] max-h-48 bg-gray-900 flex items-center justify-center overflow-hidden">
        {job.final_video_url ? (
          <video
            src={job.final_video_url}
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
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
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
          {job.flow_type === 'single'
            ? <Film className="w-3.5 h-3.5 shrink-0" />
            : <Layers className="w-3.5 h-3.5 shrink-0" />
          }
          <span>
            {job.flow_type === 'single'
              ? '1 video largo'
              : `${job.raw_video_paths.length} clips`}
          </span>
          {job.final_video_duration && (
            <span className="ml-auto font-semibold text-gray-700">
              {Math.round(job.final_video_duration)}s
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/marketing/videos-v2/${job.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver detalle
          </Link>

          {job.final_video_url && (
            <>
              <a
                href={job.final_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition-colors"
                title="Reproducir"
              >
                <Play className="w-4 h-4" />
              </a>
              <a
                href={job.final_video_url}
                download
                className="flex items-center justify-center w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
