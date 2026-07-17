/**
 * POST /api/videos/raw-clips/library/complete
 *
 * Registra los paths subidos y deja la carpeta lista en biblioteca.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType } from '@/lib/videos/types'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { appendRawClipsPaths } from '@/lib/videos/raw-clips-library'
import {
  normalizeClipOrientationsInput,
  type ClipOrientationMeta,
} from '@/lib/videos/video-orientation'
import type { Json } from '@/types/supabase'

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function isVideoClipPath(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return VIDEO_EXT.test(base)
}

interface CompleteLibraryBody {
  jobId: string
  paths: string[]
  /** Si true, agrega paths a los existentes en lugar de reemplazarlos. */
  append?: boolean
  /** Probe de orientación en el navegador (mismo orden que `paths`). */
  clipOrientations?: ClipOrientationMeta[]
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as CompleteLibraryBody
    const jobId = body.jobId?.trim()
    const paths = (body.paths ?? []).map((p) => p.trim()).filter(Boolean)
    const append = body.append === true

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 })
    }

    if (!paths.length) {
      return NextResponse.json({ error: 'paths es requerido' }, { status: 400 })
    }

    const orientations = normalizeClipOrientationsInput(body.clipOrientations, paths.length)

    if (append) {
      const result = await appendRawClipsPaths(jobId, paths, orientations)
      return NextResponse.json({ ok: true, jobId, clipCount: result.clipCount, appended: true })
    }

    for (const p of paths) {
      if (!p.startsWith(`${jobId}/`)) {
        return NextResponse.json({ error: `Ruta inválida: ${p}` }, { status: 400 })
      }
      if (!isVideoClipPath(p)) {
        return NextResponse.json({ error: `No es un clip de video: ${p}` }, { status: 400 })
      }
    }

    const supabase = getServiceClient()

    const { data: job, error: fetchError } = await supabase
      .from('video_jobs_v2')
      .select('id, inventory_vehicle_id, selected_clips')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 })
    }

    if (!job.inventory_vehicle_id) {
      return NextResponse.json(
        { error: 'La carpeta no tiene vehículo de inventario asociado' },
        { status: 400 }
      )
    }

    const flowType: FlowType = paths.length >= 2 ? 'multiple' : 'single'

    const byPath =
      orientations != null
        ? Object.fromEntries(paths.map((p, i) => [p, orientations[i]!]))
        : undefined

    const selectedClips =
      orientations != null
        ? ({
            ...(job.selected_clips &&
            typeof job.selected_clips === 'object' &&
            !Array.isArray(job.selected_clips)
              ? (job.selected_clips as Record<string, unknown>)
              : {}),
            _v2_pipeline_input: true,
            clipOrientations: orientations,
            clipOrientationsByPath: byPath,
          } as unknown as Json)
        : undefined

    const { error: updateError } = await supabase
      .from('video_jobs_v2')
      .update({
        raw_video_paths: paths,
        flow_type: flowType,
        status: 'pending',
        current_step: 'Clips en biblioteca',
        progress_percentage: 0,
        ...(selectedClips ? { selected_clips: selectedClips } : {}),
      })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, jobId, clipCount: paths.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-clips/library/complete]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
