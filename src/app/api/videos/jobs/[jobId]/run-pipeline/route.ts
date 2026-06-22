/**
 * POST /api/videos/jobs/[jobId]/run-pipeline
 *
 * Ejecuta el pipeline de Reel V2 en una invocación dedicada (hasta 5 min).
 * Lo dispara finalize/start vía dispatch interno; también sirve para reanudar jobs atascados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { runPipelineForJob } from '@/lib/videos/run-pipeline-for-job'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function authorizeInternalOrMarketing(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET?.trim()
  const header = request.headers.get('x-internal-secret')?.trim()
  if (secret && header === secret) {
    return { ok: true as const, via: 'internal' as const }
  }
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const internal = authorizeInternalOrMarketing(request)
  if (!internal) {
    const auth = await requireMarketingSession(request)
    if (!auth.ok) return auth.response
  }

  const { jobId } = await params
  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  try {
    console.log(`[VideoV2][run-pipeline][${jobId}] Inicio (${internal?.via ?? 'session'})`)

    if (internal) {
      await runPipelineForJob(jobId, { force })
      return NextResponse.json({ ok: true, jobId })
    }

    after(() => {
      runPipelineForJob(jobId, { force }).catch((err) => {
        console.error(`[VideoV2][run-pipeline][${jobId}] Error en reanudación:`, err)
      })
    })

    return NextResponse.json({ ok: true, jobId, message: 'Pipeline reanudado en el servidor' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error(`[VideoV2][run-pipeline][${jobId}]`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
