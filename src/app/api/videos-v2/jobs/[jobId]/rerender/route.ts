import { NextRequest, NextResponse } from 'next/server'
import { applyVideoJobEditorPatch, rerunCreatomateRenderForJob } from '@/lib/videos-v2/pipeline'

/**
 * POST /api/videos-v2/jobs/[jobId]/rerender
 * Body opcional:
 * - `gemini_analysis` — si se omite, usa el análisis ya guardado en el job.
 * - `subtitle_blocks_override` — si viene en el JSON, se persiste antes del render (evita perder
 *   ediciones si el cliente aún no había hecho PATCH o hubo lectura desfasada en BD).
 * Reconstruye subtítulos y vuelve a enviar a Creatomate (mismo segment_map y vídeos en Storage).
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

    let geminiOverride: unknown
    const raw = await request.text()
    if (raw.trim()) {
      let body: { gemini_analysis?: unknown; subtitle_blocks_override?: unknown | null }
      try {
        body = JSON.parse(raw) as { gemini_analysis?: unknown; subtitle_blocks_override?: unknown | null }
      } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
      }
      geminiOverride = body.gemini_analysis
      if (Object.prototype.hasOwnProperty.call(body, 'subtitle_blocks_override')) {
        await applyVideoJobEditorPatch(jobId, {
          subtitle_blocks_override: body.subtitle_blocks_override,
        })
      }
    }

    const { renderId } = await rerunCreatomateRenderForJob(jobId, geminiOverride)
    return NextResponse.json({ ok: true, renderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al re-renderizar'
    console.error('[VideoV2][/jobs/rerender]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
