import { NextRequest, NextResponse } from 'next/server'
import { rerunCreatomateRenderForJob } from '@/lib/videos-v2/pipeline'

/**
 * POST /api/videos-v2/jobs/[jobId]/rerender
 * Body opcional: { "gemini_analysis": { ... } } — si se omite, usa el análisis ya guardado en el job.
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

    let override: unknown
    const raw = await request.text()
    if (raw.trim()) {
      try {
        const body = JSON.parse(raw) as { gemini_analysis?: unknown }
        override = body.gemini_analysis
      } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
      }
    }

    const { renderId } = await rerunCreatomateRenderForJob(jobId, override)
    return NextResponse.json({ ok: true, renderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al re-renderizar'
    console.error('[VideoV2][/jobs/rerender]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
