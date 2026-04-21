'use client'

import { useEffect, useState, useCallback } from 'react'
import { Upload, Mic2, Brain, Clapperboard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { VideoJobV2 } from '@/lib/videos-v2/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

const POLL_INTERVAL_MS = 5_000
const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutos

const STEPS = [
  { key: 'uploading', label: 'Subida', description: 'Subiendo video a Storage...', icon: Upload },
  { key: 'transcribing', label: 'Audio + Visual', description: 'Transcribiendo audio y preparando análisis visual en paralelo...', icon: Mic2 },
  { key: 'analyzing', label: 'Análisis IA', description: 'Gemini analizando el video y seleccionando los mejores momentos...', icon: Brain },
  { key: 'rendering', label: 'Renderizado', description: 'Creatomate está generando el Reel...', icon: Clapperboard },
  { key: 'completed', label: 'Listo', description: 'Tu video está listo', icon: CheckCircle2 },
]

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  uploading: 1,
  transcribing: 2,
  analyzing: 3,
  rendering: 4,
  completed: 5,
  failed: -1,
}

interface PipelineStatusProps {
  jobId: string
  onCompleted: (job: VideoJobV2) => void
}

export function PipelineStatus({ jobId, onCompleted }: PipelineStatusProps) {
  const [job, setJob] = useState<VideoJobV2 | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [startTime] = useState(Date.now())

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos-v2/job-status/${jobId}`)
      if (!res.ok) return
      const data = await parseJsonOrThrow<VideoJobV2>(res)
      setJob(data)

      if (data.status === 'completed') {
        onCompleted(data)
      }
    } catch {
      // Red / HTML / JSON inválido en polling: no spamear consola
    }
  }, [jobId, onCompleted])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      fetchStatus()
      if (Date.now() - startTime > STALE_THRESHOLD_MS) {
        setIsStale(true)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchStatus, startTime])

  const currentStatusIdx = job ? (STATUS_ORDER[job.status] ?? 0) : 0

  const estimatedMinutes = job?.progress_percentage
    ? Math.ceil((100 - job.progress_percentage) / 20)
    : 5

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        <p className="text-sm text-gray-500">Iniciando pipeline...</p>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Error en el proceso</h3>
        <p className="text-sm text-red-600 max-w-md bg-red-50 px-4 py-3 rounded-xl">
          {job.error_message ?? 'Ocurrió un error desconocido'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {job.current_step ?? 'Procesando...'}
          </span>
          <span className="text-sm font-bold text-violet-600">{job.progress_percentage}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-500"
            style={{ width: `${job.progress_percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          Tiempo estimado restante: ~{estimatedMinutes} minuto{estimatedMinutes !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pipeline visual */}
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const stepIdx = STATUS_ORDER[step.key] ?? i
          const isDone = currentStatusIdx > stepIdx
          const isActive = currentStatusIdx === stepIdx
          const isPending = currentStatusIdx < stepIdx

          return (
            <div key={step.key} className={`flex items-center gap-4 p-4 rounded-xl transition-all
              ${isDone ? 'bg-violet-50 border border-violet-100' : ''}
              ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : ''}
              ${isPending ? 'bg-gray-50 border border-gray-100' : ''}
            `}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${isDone ? 'bg-violet-100' : ''}
                ${isActive ? 'bg-white/20' : ''}
                ${isPending ? 'bg-gray-200' : ''}
              `}>
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-violet-600" />
                  : isActive
                  ? <step.icon className="w-5 h-5 text-white animate-pulse" />
                  : <step.icon className="w-5 h-5 text-gray-400" />
                }
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold
                  ${isDone ? 'text-violet-700' : ''}
                  ${isActive ? 'text-white' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-white/80 mt-0.5">{step.description}</p>
                )}
              </div>
              {isActive && (
                <Loader2 className="w-4 h-4 text-white/80 animate-spin ml-auto shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Esto está tardando más de lo usual. Puedes cerrar esta ventana y el proceso continuará
          en segundo plano. Vuelve más tarde para ver el resultado.
        </div>
      )}
    </div>
  )
}
