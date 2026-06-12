import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = await req.json()
    const { paths, clipPaths, thresholdMb = 30 } = body
    const resolvedPaths: string[] = clipPaths ?? paths

    if (!resolvedPaths || !Array.isArray(resolvedPaths) || resolvedPaths.length === 0) {
      return NextResponse.json(
        { compressed: [], skipped: [], errors: [] },
        { status: 200 }
      )
    }

    const backendUrl = process.env.BACKEND_INTERNAL_URL
    const secret = process.env.INTERNAL_API_SECRET

    if (!backendUrl || !secret) {
      console.error('[compress-clips] Faltan variables BACKEND_INTERNAL_URL o INTERNAL_API_SECRET')
      return NextResponse.json(
        { compressed: [], skipped: [], errors: resolvedPaths },
        { status: 200 }
      )
    }

    console.log(`[compress-clips][${jobId}] Llamando backend NestJS con ${resolvedPaths.length} clips`)

    const response = await fetch(
      `${backendUrl}/internal/video/compress-clips`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ jobId, clipPaths: resolvedPaths, thresholdMb }),
        signal: AbortSignal.timeout(280_000), // 4min 40s
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(`[compress-clips][${jobId}] Backend respondió ${response.status}: ${text}`)
      return NextResponse.json(
        { compressed: [], skipped: [], errors: resolvedPaths },
        { status: 200 }
      )
    }

    const result = await response.json()
    console.log(`[compress-clips][${jobId}] Resultado:`, JSON.stringify(result))
    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[compress-clips] Error llamando backend: ${msg}`)
    return NextResponse.json(
      { compressed: [], skipped: [], errors: [] },
      { status: 200 }
    )
  }
}
