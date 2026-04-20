import { NextRequest, NextResponse } from 'next/server'
import type { SequenceItem } from '@/lib/videos-v2/segmenter'
import { applyVideoJobEditorPatch, getVideoJobEditorState } from '@/lib/videos-v2/pipeline'

/**
 * GET — estado para el editor manual: subtítulos (auto vs efectivo), límites de trim por segment_id, análisis Gemini.
 * PATCH — guarda `subtitle_blocks_override` y/o `sequence` (cortes) sin re-transcribir.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const state = await getVideoJobEditorState(jobId)
    return NextResponse.json(state)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const raw = await request.text()
    if (!raw.trim()) {
      return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 })
    }
    const body = JSON.parse(raw) as {
      subtitle_blocks_override?: unknown | null
      sequence?: unknown
    }
    if (body.sequence !== undefined && !Array.isArray(body.sequence)) {
      return NextResponse.json({ error: 'sequence debe ser un array' }, { status: 400 })
    }
    await applyVideoJobEditorPatch(jobId, {
      ...(body.subtitle_blocks_override !== undefined
        ? { subtitle_blocks_override: body.subtitle_blocks_override }
        : {}),
      ...(body.sequence !== undefined
        ? { sequence: body.sequence as SequenceItem[] }
        : {}),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
