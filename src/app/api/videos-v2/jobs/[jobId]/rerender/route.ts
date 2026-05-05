import { NextRequest, NextResponse } from 'next/server'
import { applyVideoJobEditorPatch, rerunCreatomateRenderForJob } from '@/lib/videos-v2/pipeline'
import { normalizeMusicTrimStartSec } from '@/lib/videos-v2/clip-config'

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
      let body: {
        gemini_analysis?: unknown
        subtitle_blocks_override?: unknown | null
        music_track_id?: unknown
        music_trim_start_sec?: unknown | null
      }
      try {
        body = JSON.parse(raw) as { gemini_analysis?: unknown; subtitle_blocks_override?: unknown | null }
      } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
      }
      geminiOverride = body.gemini_analysis
      const musicTrackId =
        typeof body.music_track_id === 'string' && body.music_track_id.trim().length > 0
          ? body.music_track_id.trim()
          : undefined
      const hasMusicTrimOverride = Object.prototype.hasOwnProperty.call(body, 'music_trim_start_sec')
      const musicTrimStartSecOverride = hasMusicTrimOverride
        ? body.music_trim_start_sec === null
          ? null
          : normalizeMusicTrimStartSec(body.music_trim_start_sec)
        : undefined
      if (Object.prototype.hasOwnProperty.call(body, 'subtitle_blocks_override')) {
        await applyVideoJobEditorPatch(jobId, {
          subtitle_blocks_override: body.subtitle_blocks_override,
        })
      }
      const { renderId } = await rerunCreatomateRenderForJob(jobId, geminiOverride, {
        musicTrackIdOverride: musicTrackId,
        musicTrimStartSecOverride,
      })
      return NextResponse.json({ ok: true, renderId })
    }

    const { renderId } = await rerunCreatomateRenderForJob(jobId, geminiOverride)
    return NextResponse.json({ ok: true, renderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al re-renderizar'
    console.error('[VideoV2][/jobs/rerender]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
