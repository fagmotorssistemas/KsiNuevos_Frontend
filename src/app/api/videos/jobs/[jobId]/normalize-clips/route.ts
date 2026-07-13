import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { normalizeRawClipsInStorage } from '@/lib/videos/normalize-video-orientation-server'

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
    }
    const paths = (body.clipPaths ?? body.paths ?? []).map((p) => p.trim()).filter(Boolean)

    if (!paths.length) {
      return NextResponse.json({ normalized: [], skipped: [], errors: [] })
    }

    for (const p of paths) {
      if (!p.startsWith(`${jobId}/`)) {
        return NextResponse.json(
          { error: `Ruta no válida para este job: ${p}` },
          { status: 400 }
        )
      }
    }

    const result = await normalizeRawClipsInStorage(jobId, paths, {
      repairFlip180: body.repairFlip180 === true,
    })
    const skipSample = result.skipDetails[0]?.reason ?? ''
    const mode = body.repairFlip180 ? 'repair180' : 'orient'
    console.log(
      `[normalize-clips][${jobId}][${mode}] normalized=${result.normalized.length} skipped=${result.skipped.length} errors=${result.errors.length}` +
        (skipSample ? ` | skip ejemplo: ${skipSample}` : '')
    )

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[normalize-clips]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
