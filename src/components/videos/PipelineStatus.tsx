'use client'

import { useEffect, useState, useCallback } from 'react'
import { Upload, Mic2, Brain, Clapperboard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { VideoJob } from '@/lib/videos/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

const POLL_INTERVAL_MS = 5_000
const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutos

/** Rangos realistas por etapa (el % no refleja bien el tiempo de Shotstack). */
function estimatedRemainingLabel(status: VideoJob['status'], progressPct: number): string {
  switch (status) {
    case 'pending':
    case 'uploading':
      return '8–12 minutos'
    case 'transcribing':
      return '6–10 minutos'
    case 'analyzing':
      return '4–8 minutos'
    case 'rendering':
      if (progressPct >= 95) return '2–6 minutos'
      return '5–12 minutos'
    case 'completed':
      return 'Listo'
    default:
      return '10–15 minutos'
  }
}

const STEPS = [
  { key: 'uploading', label: 'Subida', description: 'Subiendo video a Storage...', icon: Upload },
  { key: 'transcribing', label: 'Audio + Visual', description: 'Transcribiendo audio y preparando análisis visual en paralelo...', icon: Mic2 },
  { key: 'analyzing', label: 'Análisis IA', description: 'Gemini analizando el video y seleccionando los mejores momentos...', icon: Brain },
  { key: 'rendering', label: 'Renderizado', description: 'Shotstack está generando el Reel (esta etapa suele tardar varios minutos)...', icon: Clapperboard },
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
  onCompleted: (job: VideoJob) => void
  onCloseAllowedChange?: (allowed: boolean) => void
}

export function canCloseReelPipeline(job: VideoJob): boolean {
  if (job.status === 'failed' || job.status === 'completed') return true
  if (job.status === 'rendering') return true
  if ((job.progress_percentage ?? 0) >= 80) return true
  return false
}

export function PipelineStatus({ jobId, onCompleted, onCloseAllowedChange }: PipelineStatusProps) {
  const [job, setJob] = useState<VideoJob | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [startTime] = useState(Date.now())

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/job-status/${jobId}`)
      if (!res.ok) return
      const data = await parseJsonOrThrow<VideoJob>(res)
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

  useEffect(() => {
    if (!job) {
      onCloseAllowedChange?.(false)
      return
    }
    onCloseAllowedChange?.(canCloseReelPipeline(job))
  }, [job, onCloseAllowedChange])

  const currentStatusIdx = job ? (STATUS_ORDER[job.status] ?? 0) : 0

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

  const remainingEstimate = estimatedRemainingLabel(job.status, job.progress_percentage ?? 0)
  const closeAllowed = canCloseReelPipeline(job)

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
        <p className="text-xs text-gray-500">
          Tiempo estimado restante: <span className="font-medium text-gray-600">{remainingEstimate}</span>
        </p>
        {closeAllowed ? (
          <p className="text-xs text-gray-400 leading-relaxed">
            La creación del Reel toma su tiempo; el renderizado puede demorar varios minutos aunque la barra
            avance rápido.{' '}
            <span className="text-gray-600">
              Ya comenzó el renderizado: puedes cerrar esta ventana y seguir navegando. El proceso continúa en
              el servidor. Revisa el avance en Marketing → Videos.
            </span>
          </p>
        ) : (
          <p className="text-xs text-amber-800 leading-relaxed rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="font-semibold">No cierres esta ventana todavía.</span> Mantén el modal abierto
            hasta que comience el renderizado (alrededor del 80% de la barra). Si sales antes, el Reel puede
            quedarse trabado y no continuar.
          </p>
        )}
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

      {isStale && closeAllowed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Esto está tardando más de lo usual. Puedes cerrar esta ventana y navegar por el sitio: el Reel
          sigue generándose. Vuelve a Marketing → Videos para ver el estado.
        </div>
      )}
    </div>
  )
}
