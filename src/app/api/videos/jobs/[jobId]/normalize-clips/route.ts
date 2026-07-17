/**
 * POST /api/videos/jobs/[jobId]/normalize-clips
 *
 * Proxy a Nest (`BACKEND_INTERNAL_URL`) — ffmpeg corre en el servidor, no en la PC del usuario.
 * Contrato Nest esperado:
 *   POST /internal/video/normalize-clips
 *   GET  /internal/video/normalize-clips/:jobId/status
 * Body: { jobId, clipPaths, repairFlip180? }
 * Result: { normalized, skipped, skipDetails?, errors }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { runNestVideoJob } from '@/lib/videos/nest-video-job'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(req)
  if (!auth.ok) return auth.response

  try {
    const { jobId } = await params
    const body = (await req.json()) as {
      paths?: string[]
      clipPaths?: string[]
      repairFlip180?: boolean
      /** Preferencias por path (probe en el navegador). Nest debe respetar mode. */
      clipPlans?: Array<{ path: string; mode: 'reencode' | 'strip_meta'; reason?: string }>
    }
    const paths = (body.clipPaths ?? body.paths ?? []).map((p) => p.trim()).filter(Boolean)

    if (!paths.length) {
      return NextResponse.json({ normalized: [], skipped: [], errors: [], skipDetails: [] })
    }

    for (const p of paths) {
      if (!p.startsWith(`${jobId}/`)) {
        return NextResponse.json(
          { error: `Ruta no válida para este job: ${p}` },
          { status: 400 }
        )
      }
    }

    const clipPlans = (body.clipPlans ?? []).filter(
      (row) =>
        row &&
        typeof row.path === 'string' &&
        paths.includes(row.path) &&
        (row.mode === 'reencode' || row.mode === 'strip_meta')
    )

    const mode = body.repairFlip180 === true ? 'repair180' : 'orient'
    const empty = {
      normalized: [] as string[],
      skipped: [] as string[],
      skipDetails: [] as Array<{ path: string; reason: string }>,
      errors: [] as string[],
    }

    const nest = await runNestVideoJob({
      label: 'normalize-clips',
      jobId,
      startPath: '/internal/video/normalize-clips',
      statusPath: `/internal/video/normalize-clips/${jobId}/status`,
      body: {
        jobId,
        clipPaths: paths,
        repairFlip180: body.repairFlip180 === true,
        ...(clipPlans.length ? { clipPlans } : {}),
        /**
         * Contrato Nest (ffmpeg 4.4 — NO usar -display_rotation):
         * - mode=reencode: -noautorotate -vf transpose=… -metadata:s:v:0 rotate=0
         * - mode=strip_meta (1080x1920 + rotate≠0): SIN transpose;
         *   -c copy -metadata:s:v:0 rotate=0 (si el tag queda, reencode SIN vf)
         * Si tras procesar sigue rotate≠0 con H>W → ERROR (el caso del Beetle).
         */
      },
      emptyResult: empty,
    })

    const result = {
      normalized: Array.isArray(nest.result.normalized) ? (nest.result.normalized as string[]) : [],
      skipped: Array.isArray(nest.result.skipped) ? (nest.result.skipped as string[]) : [],
      skipDetails: Array.isArray(nest.result.skipDetails)
        ? (nest.result.skipDetails as Array<{ path: string; reason: string }>)
        : [],
      errors: Array.isArray(nest.result.errors) ? (nest.result.errors as string[]) : [],
    }

    if (!nest.ok && result.errors.length === 0) {
      result.errors = [
        'Nest no respondió normalize-clips. ¿Existe POST /internal/video/normalize-clips en el backend?',
      ]
      result.skipDetails = paths.map((path) => ({
        path,
        reason: 'endpoint Nest normalize-clips no disponible',
      }))
      result.skipped = [...paths]
    }

    console.log(
      `[normalize-clips][${jobId}][${mode}] nest ok=${nest.ok} normalized=${result.normalized.length} skipped=${result.skipped.length} errors=${result.errors.length}`
    )

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[normalize-clips]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
