'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Megaphone,
  CheckCircle2,
  Newspaper,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import type { NoticieroJob } from '@/lib/noticiero/types'
import { canApproveNoticieroForPublish, resolveNoticieroSocialStage } from '@/lib/noticiero/publish-flow'

export default function NoticieroJobDetailPage() {
  const params = useParams()
  const jobId = params.jobId as string

  const [job, setJob] = useState<NoticieroJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${jobId}`)
      if (res.status === 404) {
        setError('Noticiero no encontrado')
        return
      }
      if (!res.ok) throw new Error('Error cargando noticiero')
      const data = (await res.json()) as NoticieroJob
      setJob(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void fetchJob()
  }, [fetchJob])

  useEffect(() => {
    if (!job || ['completed', 'failed'].includes(job.status)) return
    const interval = setInterval(() => void fetchJob(), 5000)
    return () => clearInterval(interval)
  }, [job, fetchJob])

  const canResume =
    job?.status === 'compositing' &&
    Boolean(job?.heygen_video_url?.trim()) &&
    !job?.final_video_url?.trim()

  async function handleResumeVideo() {
    setIsResuming(true)
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${jobId}/resume-video`, {
        method: 'POST',
      })
      const data = await parseJsonOrThrow<{ job?: NoticieroJob; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'No se pudo reanudar')
      if (data.job) setJob(data.job)
      else await fetchJob()
      toast.success('Video compuesto correctamente')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al reanudar')
    } finally {
      setIsResuming(false)
    }
  }

  async function handleApprove() {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/marketing/noticiero/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_publish_stage: 'aprobado' }),
      })
      const data = (await res.json()) as NoticieroJob & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo aprobar')
      setJob(data)
      toast.success('Aprobado. Ve a Publicación para programar en redes.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar')
    } finally {
      setIsApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">{error ?? 'No encontrado'}</p>
        <Link href="/marketing/noticiero" className="text-violet-600 text-sm font-semibold hover:underline">
          Volver al noticiero
        </Link>
      </div>
    )
  }

  const socialStage = resolveNoticieroSocialStage(job)
  const canApprove = canApproveNoticieroForPublish(job)
  const vehicle = job.vehicle_snapshot

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/marketing/noticiero"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">
                {job.job_name?.trim() || `Noticiero ${job.id.slice(0, 8)}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {job.mode === 'vehicle' && vehicle
                  ? `${vehicle.brand} ${vehicle.model}`
                  : job.custom_topic ?? 'Tema personalizado'}
              </p>
            </div>
          </div>

          {canResume && (
            <button
              type="button"
              disabled={isResuming}
              onClick={() => void handleResumeVideo()}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isResuming ? 'animate-spin' : ''}`} />
              {isResuming ? 'Componiendo…' : 'Reanudar composición'}
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => void handleApprove()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-60"
            >
              <Megaphone className="w-4 h-4" />
              {isApproving ? 'Aprobando...' : 'Aprobar para publicar'}
            </button>
          )}

          {socialStage && socialStage !== 'generado' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              {socialStage === 'aprobado' ? 'Aprobado — programa en Publicación' : socialStage}
            </div>
          )}
        </div>

        {canResume && !job.error_message && (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 px-4 py-3 rounded-xl">
            El avatar de HeyGen ya está listo, pero la composición en Creatomate no terminó (por ejemplo si
            cerraste la pestaña). Pulsa «Reanudar composición» para generar el video final sin repetir HeyGen.
          </p>
        )}

        {job.error_message && !job.final_video_url && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{job.error_message}</p>
        )}
      </div>

      {job.final_video_url && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Video</h2>
          {job.banner_title && (
            <p className="text-xs font-bold tracking-wide text-violet-700 uppercase mb-3">{job.banner_title}</p>
          )}
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <video src={job.final_video_url} controls className="w-full h-full" playsInline />
          </div>
        </div>
      )}

      {job.script_text && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-3">Guión</h2>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
            {job.script_text}
          </p>
        </div>
      )}
    </div>
  )
}
