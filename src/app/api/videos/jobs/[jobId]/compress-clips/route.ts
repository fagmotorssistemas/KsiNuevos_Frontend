import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 300_000 // 5 min máximo

type NestCompressStatus =
  | { status: 'processing' | 'not_found' }
  | { status: 'done'; result: Record<string, unknown> }
  | { status: 'failed'; error?: string }

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
    }
    const resolvedPaths: string[] = body.clipPaths ?? body.paths ?? []
    const thresholdMb = body.thresholdMb ?? 30

    if (!resolvedPaths.length) {
      return NextResponse.json({ compressed: [], skipped: [], errors: [] }, { status: 200 })
    }

    const nestBase = process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '')
    const secret = process.env.INTERNAL_API_SECRET

    if (!nestBase || !secret) {
      console.error('[compress-clips] Faltan BACKEND_INTERNAL_URL o INTERNAL_API_SECRET')
      return NextResponse.json(
        { compressed: [], skipped: [], errors: resolvedPaths },
        { status: 200 }
      )
    }

    console.log(`[compress-clips][${jobId}] Iniciando compresión async en Nest (${resolvedPaths.length} clips)`)

    const startRes = await fetch(`${nestBase}/internal/video/compress-clips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ jobId, clipPaths: resolvedPaths, thresholdMb }),
    })

    // Nest legacy (sync): 200 con resultado completo
    if (startRes.ok && startRes.status === 200) {
      const result = (await startRes.json()) as Record<string, unknown>
      console.log(`[compress-clips][${jobId}] Nest sync OK:`, JSON.stringify(result))
      return NextResponse.json(result, { status: 200 })
    }

    if (!startRes.ok && startRes.status !== 202) {
      const text = await startRes.text()
      console.error(`[compress-clips][${jobId}] Nest start ${startRes.status}: ${text.slice(0, 500)}`)
      return NextResponse.json(
        { compressed: [], skipped: [], errors: resolvedPaths },
        { status: 200 }
      )
    }

    console.log(`[compress-clips][${jobId}] Nest 202 — polling status cada ${POLL_INTERVAL_MS}ms`)

    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

      const statusRes = await fetch(`${nestBase}/internal/video/compress-clips/${jobId}/status`, {
        headers: { 'x-internal-secret': secret },
      })

      if (!statusRes.ok) {
        const text = await statusRes.text()
        console.warn(
          `[compress-clips][${jobId}] Status poll HTTP ${statusRes.status}: ${text.slice(0, 200)}`
        )
        continue
      }

      let status: NestCompressStatus
      try {
        status = (await statusRes.json()) as NestCompressStatus
      } catch {
        continue
      }

      if (status.status === 'done') {
        console.log(`[compress-clips][${jobId}] Compresión done:`, JSON.stringify(status.result))
        return NextResponse.json(status.result, { status: 200 })
      }

      if (status.status === 'failed') {
        const errMsg = status.error ?? 'Compresión fallida en Nest'
        console.error(`[compress-clips][${jobId}] Nest failed: ${errMsg}`)
        return NextResponse.json(
          { compressed: [], skipped: [], errors: [errMsg, ...resolvedPaths] },
          { status: 200 }
        )
      }
    }

    console.error(`[compress-clips][${jobId}] Timeout tras ${POLL_TIMEOUT_MS}ms`)
    return NextResponse.json(
      { compressed: [], skipped: [], errors: ['Timeout esperando compresión', ...resolvedPaths] },
      { status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[compress-clips] Error: ${msg}`)
    return NextResponse.json({ compressed: [], skipped: [], errors: [] }, { status: 200 })
  }
}
