'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, Film, Layers, Upload, Mic2, Brain, Clapperboard,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { JobManualEditor } from '@/components/videos-v2/JobManualEditor'
import { VideoPlayer } from '@/components/videos-v2/VideoPlayer'
import { PipelineStatus } from '@/components/videos-v2/PipelineStatus'
import type { VideoJobV2 } from '@/lib/videos-v2/types'

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600', icon: Clock },
  uploading: { label: 'Subiendo', className: 'bg-blue-100 text-blue-700', icon: Upload },
  transcribing: { label: 'Transcribiendo', className: 'bg-yellow-100 text-yellow-700', icon: Mic2 },
  analyzing: { label: 'Analizando', className: 'bg-orange-100 text-orange-700', icon: Brain },
  rendering: { label: 'Renderizando', className: 'bg-violet-100 text-violet-700', icon: Clapperboard },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Error', className: 'bg-red-100 text-red-700', icon: AlertCircle },
}

function formatDate(str: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(str))
}

const PIPELINE_STEPS = [
  { key: 'uploading', label: 'Subida a Storage', icon: Upload },
  { key: 'transcribing', label: 'Transcripción AssemblyAI', icon: Mic2 },
  { key: 'analyzing', label: 'Análisis Gemini IA', icon: Brain },
  { key: 'rendering', label: 'Renderizado Creatomate', icon: Clapperboard },
  { key: 'completed', label: 'Completado', icon: CheckCircle2 },
]

const STATUS_ORDER: Record<string, number> = {
  pending: 0, uploading: 1, transcribing: 2, analyzing: 3, rendering: 4, completed: 5, failed: -1,
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [job, setJob] = useState<VideoJobV2 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos-v2/job-status/${jobId}`)
      if (res.status === 404) { setError('Job no encontrado'); return }
      if (!res.ok) throw new Error('Error cargando job')
      const data = (await res.json()) as VideoJobV2
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void fetchJob()
  }, [fetchJob])

  const isProcessing = job && !['completed', 'failed'].includes(job.status)

  // Nuevo formato: secuencia de segmentos
  const gemini = job?.gemini_analysis
  const segmentAnalysis =
    gemini != null && 'sequence' in gemini ? gemini : null

  const canRerenderFromEditor = Boolean(
    job &&
      job.segment_map &&
      segmentAnalysis &&
      (job.status === 'completed' || job.status === 'failed')
  )

  const currentStatusIdx = job ? (STATUS_ORDER[job.status] ?? 0) : 0

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">{error ?? 'Job no encontrado'}</p>
        <Link href="/marketing/videos-v2" className="text-violet-600 hover:underline text-sm font-semibold">
          Volver al listado
        </Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[job.status]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/marketing/videos-v2"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
              {job.flow_type === 'single'
                ? <Film className="w-6 h-6 text-violet-600" />
                : <Layers className="w-6 h-6 text-violet-600" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-gray-900">Job #{job.id.slice(0, 8)}…</h1>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {job.flow_type === 'single' ? '1 video largo' : `${job.raw_video_paths.length} clips`}
                {' · '}Creado {formatDate(job.created_at)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchJob}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Video / Pipeline */}
          {job.status === 'completed' && job.final_video_url ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Video Final</h2>
              <div className="flex justify-center">
                <VideoPlayer url={job.final_video_url} duration={job.final_video_duration} />
              </div>
            </div>
          ) : isProcessing ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Progreso del Pipeline</h2>
              <PipelineStatus
                jobId={job.id}
                onCompleted={(updated) => setJob(updated)}
              />
            </div>
          ) : job.status === 'failed' ? (
            <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-red-800 mb-2">Error en el proceso</h2>
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                    {job.error_message ?? 'Error desconocido'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Análisis Gemini — nuevo formato con secuencia de segmentos */}
          {segmentAnalysis && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-orange-500" />
                <h2 className="text-base font-bold text-gray-900">Análisis de Gemini IA</h2>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-600 italic">{segmentAnalysis.overall_strategy}</p>
                <p className="text-xs font-semibold text-gray-500">
                  {segmentAnalysis.sequence.length} segmentos seleccionados — Total: {segmentAnalysis.total_duration.toFixed(1)}s
                </p>
                {segmentAnalysis.sequence.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-violet-700">
                        #{item.order} Seg {item.segment_id} (Clip {item.clip_index})
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.trim_start.toFixed(1)}s → {item.trim_end.toFixed(1)}s ({item.trim_duration.toFixed(1)}s)
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{item.reason}</p>
                  </div>
                ))}
              </div>

              {canRerenderFromEditor && (
                <JobManualEditor
                  jobId={jobId}
                  onSaved={async () => {
                    await fetchJob()
                    router.refresh()
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Sidebar derecho — Timeline del pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Timeline del Pipeline</h3>
            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, i) => {
                const stepIdx = i + 1
                const isDone = currentStatusIdx > stepIdx
                const isActive = currentStatusIdx === stepIdx
                const isFailed = job.status === 'failed' && isActive

                return (
                  <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isFailed ? 'bg-red-50' : isDone ? 'bg-violet-50' : isActive ? 'bg-violet-600' : 'bg-gray-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isFailed ? 'bg-red-100' : isDone ? 'bg-violet-100' : isActive ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      {isFailed
                        ? <AlertCircle className="w-4 h-4 text-red-600" />
                        : isDone
                        ? <CheckCircle2 className="w-4 h-4 text-violet-600" />
                        : <step.icon className={`w-4 h-4 ${isActive ? 'text-white animate-pulse' : 'text-gray-400'}`} />
                      }
                    </div>
                    <span className={`text-xs font-semibold ${
                      isFailed ? 'text-red-700' : isDone ? 'text-violet-700' : isActive ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && !isFailed && (
                      <Loader2 className="w-3 h-3 text-white/70 animate-spin ml-auto" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metadata del job */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Información</h3>
            {[
              { label: 'Job ID', value: job.id },
              { label: 'Flujo', value: job.flow_type === 'single' ? 'Video único' : 'Múltiples clips' },
              { label: 'Creado', value: formatDate(job.created_at) },
              { label: 'Actualizado', value: formatDate(job.updated_at) },
              ...(job.assemblyai_transcript_id ? [{ label: 'AssemblyAI ID', value: job.assemblyai_transcript_id }] : []),
              ...(job.creatomate_render_id ? [{ label: 'Creatomate ID', value: job.creatomate_render_id }] : []),
              ...(job.final_video_duration ? [{ label: 'Duración final', value: `${Math.round(job.final_video_duration)}s` }] : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-400">{label}</p>
                <p className="text-xs text-gray-700 font-mono break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
