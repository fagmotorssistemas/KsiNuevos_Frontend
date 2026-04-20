import { NextRequest, NextResponse } from 'next/server'
import type { CreatomateFlatRenderScript } from '@/lib/videos-v2/creatomate'
import { startCreatomateRenderFromClientScript } from '@/lib/videos-v2/pipeline'

function parseClientRenderSource(raw: unknown): CreatomateFlatRenderScript {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Body: se requiere { "source": { ... } }')
  }
  const o = raw as Record<string, unknown>
  if (o.output_format !== 'mp4') {
    throw new Error('Solo se admite source.output_format "mp4"')
  }
  if (typeof o.width !== 'number' || typeof o.height !== 'number') {
    throw new Error('source.width y source.height deben ser números')
  }
  if (typeof o.duration !== 'number' || !Number.isFinite(o.duration) || o.duration <= 0) {
    throw new Error('source.duration debe ser un número positivo')
  }
  if (!Array.isArray(o.elements)) {
    throw new Error('source.elements debe ser un array')
  }
  if (o.elements.length > 800) {
    throw new Error('Demasiados elementos en source.elements')
  }
  return o as CreatomateFlatRenderScript
}

/**
 * POST — Inicia un render en Creatomate con el JSON devuelto por Preview.getSource() (tras edición en el SDK).
 * Body: { "source": { output_format, width, height, duration, elements } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    if (!jobId) {
      return NextResponse.json({ error: 'jobId requerido' }, { status: 400 })
    }
    const body = (await request.json()) as { source?: unknown }
    if (!body.source) {
      return NextResponse.json({ error: 'Falta "source" en el body' }, { status: 400 })
    }
    const source = parseClientRenderSource(body.source)
    const { renderId } = await startCreatomateRenderFromClientScript(jobId, source)
    return NextResponse.json({ ok: true, renderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    console.error('[VideoV2][/creatomate-render-from-source]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
