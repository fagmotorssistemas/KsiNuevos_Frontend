import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { runPipelineForJob } from '@/lib/videos/run-pipeline-for-job'

function pipelineRunOrigin(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (site) return site.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  return null
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function markJobDispatchFailed(jobId: string, reason: unknown) {
  const msg = reason instanceof Error ? reason.message : String(reason)
  try {
    const supabase = getServiceClient()
    await supabase
      .from('video_jobs_v2')
      .update({
        status: 'failed',
        error_message: `No se pudo iniciar el pipeline: ${msg}`.slice(0, 500),
        current_step: 'Error al iniciar pipeline',
      })
      .eq('id', jobId)
      .in('status', ['pending', 'uploading'])
  } catch (err) {
    console.error(`[VideoV2][${jobId}] No se pudo marcar job como failed tras dispatch:`, err)
  }
}

async function invokeRunPipelineRoute(jobId: string, origin: string, secret: string) {
  const url = `${origin}/api/videos/jobs/${jobId}/run-pipeline`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-internal-secret': secret,
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(310_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `dispatch run-pipeline HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`
    )
  }

  console.log(`[VideoV2][${jobId}] dispatch run-pipeline OK (${url})`)
}

/**
 * Dispara el pipeline en una invocación serverless dedicada (`/run-pipeline`, maxDuration 300s).
 * Usa `after()` para que el dispatch sobreviva al cierre de la lambda de finalize en Vercel.
 */
export function dispatchVideoPipelineRun(jobId: string): void {
  const origin = pipelineRunOrigin()
  const secret = process.env.INTERNAL_API_SECRET?.trim()

  after(async () => {
    try {
      if (!origin || !secret) {
        console.warn(
          `[VideoV2][${jobId}] Sin SITE_URL/VERCEL_URL o INTERNAL_API_SECRET; pipeline en proceso (after)`
        )
        await runPipelineForJob(jobId)
        return
      }

      await invokeRunPipelineRoute(jobId, origin, secret)
    } catch (err) {
      console.error(`[VideoV2][${jobId}] dispatch pipeline failed:`, err)
      await markJobDispatchFailed(jobId, err)
    }
  })
}
