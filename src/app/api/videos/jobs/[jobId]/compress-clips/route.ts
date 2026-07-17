import { NextRequest, NextResponse } from 'next/server'
import { runNestVideoJob } from '@/lib/videos/nest-video-job'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = (await req.json()) as {
      paths?: string[]
      clipPaths?: string[]
      thresholdMb?: number
      normalizeOrientation?: boolean
    }
    const resolvedPaths: string[] = body.clipPaths ?? body.paths ?? []
    const thresholdMb = body.thresholdMb ?? 30
    // Cliente manda true al generar reel (Shotstack transform.rotate desactivado).
    const normalizeOrientation = body.normalizeOrientation !== false

    if (!resolvedPaths.length) {
      return NextResponse.json({ compressed: [], skipped: [], errors: [] }, { status: 200 })
    }

    const nest = await runNestVideoJob({
      label: 'compress-clips',
      jobId,
      startPath: '/internal/video/compress-clips',
      statusPath: `/internal/video/compress-clips/${jobId}/status`,
      body: {
        jobId,
        clipPaths: resolvedPaths,
        thresholdMb,
        // Nest puede aplicar orientación aquí también (ffmpeg en servidor).
        normalizeOrientation,
      },
      emptyResult: {
        compressed: [],
        skipped: [],
        errors: resolvedPaths,
      },
    })

    return NextResponse.json(nest.result, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[compress-clips] Error: ${msg}`)
    return NextResponse.json({ compressed: [], skipped: [], errors: [] }, { status: 200 })
  }
}
