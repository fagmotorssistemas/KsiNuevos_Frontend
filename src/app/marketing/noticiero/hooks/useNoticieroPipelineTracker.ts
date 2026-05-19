'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import {
  jobStatusToPipelineStep,
  NOTICIERO_ACTIVE_JOB_STORAGE_KEY,
} from '@/lib/noticiero/pipeline'
import type { NoticieroJob, NoticieroPipelineStep } from '@/lib/noticiero/types'

const POLL_MS = 3000

function isTransientFetchError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('fetch failed') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('aborted') ||
    m.includes('abort')
  )
}

export function useNoticieroPipelineTracker(onTerminal?: () => void) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [pipelineStep, setPipelineStep] = useState<NoticieroPipelineStep>('idle')
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [progressPercentage, setProgressPercentage] = useState(0)
  const resumeTriggeredRef = useRef(false)

  const clearActiveJob = useCallback(() => {
    setActiveJobId(null)
    try {
      localStorage.removeItem(NOTICIERO_ACTIVE_JOB_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const applyJobState = useCallback(
    (job: NoticieroJob) => {
      setProgressPercentage(job.progress_percentage ?? 0)
      const step = jobStatusToPipelineStep(job)
      setPipelineStep(step)

      if (job.final_video_url?.trim()) {
        clearActiveJob()
        setPipelineError(null)
        setPipelineStep('done')
        onTerminal?.()
        return 'completed' as const
      }

      if (job.status === 'completed') {
        clearActiveJob()
        setPipelineError(null)
        setPipelineStep('done')
        onTerminal?.()
        return 'completed' as const
      }

      if (job.status === 'failed') {
        clearActiveJob()
        setPipelineError(job.error_message ?? 'El noticiero falló')
        onTerminal?.()
        return 'failed' as const
      }

      // No mostrar error_message de BD mientras el job sigue en curso (p. ej. timeout HeyGen ya resuelto)
      setPipelineError(null)
      return 'running' as const
    },
    [clearActiveJob, onTerminal]
  )

  const ensureServerPipeline = useCallback(async (jobId: string) => {
    try {
      await fetch(`/api/marketing/noticiero/jobs/${jobId}/run-pipeline`, { method: 'POST' })
    } catch {
      /* El polling seguirá intentando */
    }
  }, [])

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/marketing/noticiero/jobs/${jobId}`)
        if (res.status === 404) {
          clearActiveJob()
          setPipelineStep('error')
          setPipelineError('Noticiero no encontrado')
          return
        }

        const job = await parseJsonOrThrow<NoticieroJob>(res)
        if (!res.ok) throw new Error('Error consultando el progreso')

        const outcome = applyJobState(job)

        if (outcome === 'completed') {
          toast.success('Noticiero generado. Apruébalo y programa la publicación en la pestaña Publicación.')
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error de red'
        if (!isTransientFetchError(message)) {
          console.warn('[noticiero/poll]', message)
        }
      }
    },
    [applyJobState, clearActiveJob]
  )

  const startTracking = useCallback(
    (jobId: string) => {
      setActiveJobId(jobId)
      setPipelineError(null)
      setPipelineStep('script')
      setProgressPercentage(5)
      resumeTriggeredRef.current = false

      try {
        localStorage.setItem(NOTICIERO_ACTIVE_JOB_STORAGE_KEY, jobId)
      } catch {
        /* ignore */
      }
    },
    []
  )

  useEffect(() => {
    if (!activeJobId) return

    void pollJob(activeJobId)

    if (!resumeTriggeredRef.current) {
      resumeTriggeredRef.current = true
      void ensureServerPipeline(activeJobId)
    }

    const interval = setInterval(() => {
      void pollJob(activeJobId)
    }, POLL_MS)

    return () => clearInterval(interval)
  }, [activeJobId, pollJob, ensureServerPipeline])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTICIERO_ACTIVE_JOB_STORAGE_KEY)
      if (saved && !activeJobId) {
        setActiveJobId(saved)
        setPipelineStep('script')
      }
    } catch {
      /* ignore */
    }
  }, [activeJobId])

  const isRunning =
    activeJobId !== null && pipelineStep !== 'idle' && pipelineStep !== 'done' && pipelineStep !== 'error'

  return {
    activeJobId,
    pipelineStep,
    pipelineError,
    progressPercentage,
    isRunning,
    startTracking,
    clearActiveJob,
  }
}
