import { runPipelineForJob } from '@/lib/videos/run-pipeline-for-job'

function pipelineRunOrigin(): string | null {
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (site) return site.replace(/\/$/, '')
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  return null
}

/**
 * Dispara el pipeline en una invocación serverless dedicada (`/run-pipeline`, maxDuration 300s).
 * En local ejecuta en el mismo proceso.
 */
export function dispatchVideoPipelineRun(jobId: string): void {
  const origin = pipelineRunOrigin()
  const secret = process.env.INTERNAL_API_SECRET?.trim()

  if (!origin || !secret) {
    console.warn(
      `[VideoV2][${jobId}] Sin VERCEL_URL/SITE_URL o INTERNAL_API_SECRET; ejecutando pipeline en proceso local`
    )
    void runPipelineForJob(jobId).catch((err) => {
      console.error(`[VideoV2][${jobId}] runPipelineForJob failed:`, err)
    })
    return
  }

  const url = `${origin}/api/videos/jobs/${jobId}/run-pipeline`
  fetch(url, {
    method: 'POST',
    headers: {
      'x-internal-secret': secret,
      'Content-Type': 'application/json',
    },
    body: '{}',
  }).catch((err) => {
    console.error(`[VideoV2][${jobId}] dispatch run-pipeline failed (${url}):`, err)
  })
}
