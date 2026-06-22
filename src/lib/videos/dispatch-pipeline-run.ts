import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { runPipelineForJob } from '@/lib/videos/run-pipeline-for-job'

/** Origen para self-fetch server-to-server (evita el dominio público con Deployment Protection). */
function pipelineRunOrigins(): string[] {
  const origins: string[] = []
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) origins.push(`https://${vercel}`)
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (site) origins.push(site.replace(/\/$/, ''))
  if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:3000')
  return [...new Set(origins)]
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

function dispatchHeaders(secret: string): Record<string, string> {
  const headers: Record<string, string> = {
    'x-internal-secret': secret,
    'Content-Type': 'application/json',
  }
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass
  }
  return headers
}

async function invokeRunPipelineRoute(jobId: string, origin: string, secret: string) {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  const query = bypass ? `?x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : ''
  const url = `${origin}/api/videos/jobs/${jobId}/run-pipeline${query}`
  const res = await fetch(url, {
    method: 'POST',
    headers: dispatchHeaders(secret),
    body: '{}',
    signal: AbortSignal.timeout(310_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const isAuthWall =
      res.status === 401 &&
      (text.includes('Authentication Required') || text.includes('<!doctype html>'))
    if (isAuthWall) {
      throw new Error(
        'dispatch bloqueado por Vercel Deployment Protection (401). ' +
          'Activa "Protection Bypass for Automation" en Vercel → Project → Deployment Protection ' +
          '(genera VERCEL_AUTOMATION_BYPASS_SECRET) y redeploy.'
      )
    }
    throw new Error(
      `dispatch run-pipeline HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`
    )
  }

  console.log(`[VideoV2][${jobId}] dispatch run-pipeline OK (${origin})`)
}

async function dispatchViaHttp(jobId: string, secret: string) {
  const origins = pipelineRunOrigins()
  if (origins.length === 0) {
    throw new Error('No hay origen para dispatch (VERCEL_URL / SITE_URL / localhost)')
  }

  let lastErr: unknown
  for (const origin of origins) {
    try {
      await invokeRunPipelineRoute(jobId, origin, secret)
      return
    } catch (err) {
      lastErr = err
      console.warn(`[VideoV2][${jobId}] dispatch falló contra ${origin}:`, err)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/**
 * Dispara el pipeline en una invocación serverless dedicada (`/run-pipeline`, maxDuration 300s).
 * Usa `after()` para que el dispatch sobreviva al cierre de la lambda de finalize en Vercel.
 */
export function dispatchVideoPipelineRun(jobId: string): void {
  const secret = process.env.INTERNAL_API_SECRET?.trim()

  after(async () => {
    try {
      if (!secret) {
        console.warn(
          `[VideoV2][${jobId}] Sin INTERNAL_API_SECRET; ejecutando pipeline en proceso (after)`
        )
        await runPipelineForJob(jobId)
        return
      }

      await dispatchViaHttp(jobId, secret)
    } catch (err) {
      console.error(`[VideoV2][${jobId}] dispatch pipeline failed:`, err)
      await markJobDispatchFailed(jobId, err)
    }
  })
}
