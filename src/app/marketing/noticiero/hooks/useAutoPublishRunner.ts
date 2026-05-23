'use client'

import { useCallback, useEffect, useState } from 'react'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import type { NoticieroHistory, NoticieroPipelineStep } from '@/lib/noticiero/types'

const POLL_MS = 3000

function historyToPipelineStep(row: NoticieroHistory | null): NoticieroPipelineStep {
  if (!row) return 'idle'
  if (row.status === 'completed') return 'done'
  if (row.status === 'error') return 'error'
  if (row.final_video_url) return 'video'
  if (row.heygen_video_url) return 'video'
  if (row.generated_script?.trim()) return 'avatar'
  return 'script'
}

export function useAutoPublishRunner(onDone?: () => void) {
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [pipelineStep, setPipelineStep] = useState<NoticieroPipelineStep>('idle')
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const pollHistory = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/marketing/noticiero/history?id=${encodeURIComponent(id)}`)
        const row = await parseJsonOrThrow<NoticieroHistory>(res)
        if (!res.ok) throw new Error('Error consultando progreso')

        setPipelineStep(historyToPipelineStep(row))

        if (row.status === 'completed') {
          setIsRunning(false)
          setHistoryId(null)
          setPipelineError(null)
          setPipelineStep('done')
          onDone?.()
          return
        }

        if (row.status === 'error') {
          setIsRunning(false)
          setHistoryId(null)
          setPipelineError(row.error_message ?? 'La publicación falló')
          setPipelineStep('error')
          onDone?.()
        }
      } catch (e) {
        console.warn('[auto-publish/poll]', e)
      }
    },
    [onDone]
  )

  useEffect(() => {
    if (!historyId || !isRunning) return
    void pollHistory(historyId)
    const interval = setInterval(() => void pollHistory(historyId), POLL_MS)
    return () => clearInterval(interval)
  }, [historyId, isRunning, pollHistory])

  const startRun = useCallback(async () => {
    setIsRunning(true)
    setPipelineError(null)
    setPipelineStep('script')

    const res = await fetch('/api/marketing/noticiero/auto-publish', { method: 'POST' })
    const data = await parseJsonOrThrow<{
      historyId?: string
      skipped?: boolean
      reason?: string
      error?: string
    }>(res)

    if (!res.ok) throw new Error(data.error ?? 'No se pudo iniciar la publicación')

    if (data.skipped) {
      setIsRunning(false)
      setPipelineStep('idle')
      throw new Error(data.reason ?? 'Publicación omitida')
    }

    if (!data.historyId) throw new Error('Respuesta inválida del servidor')
    setHistoryId(data.historyId)
  }, [])

  return {
    isRunning,
    pipelineStep,
    pipelineError,
    startRun,
  }
}
