/**
 * POST /api/videos-v2/jobs/start
 *
 * Recibe el jobId y los paths de los archivos ya subidos a Supabase Storage.
 * Actualiza el job con los paths y dispara el pipeline en background.
 *
 * Body JSON: { jobId, paths: string[], clipKinds?, clipDurations?, voiceOverBaseClipIndex? }
 * Response:  { jobId, status: 'processing' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { startPipelineBackground } from '@/lib/videos-v2/pipeline'
import { getSignedUrlForPath } from '@/lib/videos-v2/storage'
import type { VideoClipKind } from '@/lib/videos-v2/clip-config'
import {
  normalizeClipKindsInput,
  normalizeClipDurationsInput,
  normalizeVoiceOverBaseClipIndex,
} from '@/lib/videos-v2/clip-config'

function getServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface StartJobBody {
  jobId: string
  paths: string[]
  /** Misma longitud que paths: "spoken" | "visual_only" por clip (solo flujo múltiple). */
  clipKinds?: string[]
  /** Duración en segundos por clip; en índices B-roll evita depender de ffprobe en el servidor. */
  clipDurations?: Array<number | null>
  /** Índice del clip cuyo audio completo abre el Reel (solo múltiple; debe tener habla detectada). */
  voiceOverBaseClipIndex?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartJobBody
    const {
      jobId,
      paths,
      clipKinds: clipKindsRaw,
      clipDurations: clipDurationsRaw,
      voiceOverBaseClipIndex: voiceOverRaw,
    } = body

    if (!jobId || !paths?.length) {
      return NextResponse.json(
        { error: 'jobId y paths son requeridos' },
        { status: 400 }
      )
    }

    let clipKinds: VideoClipKind[] | undefined
    if (clipKindsRaw !== undefined) {
      if (!Array.isArray(clipKindsRaw) || clipKindsRaw.length !== paths.length) {
        return NextResponse.json(
          { error: 'clipKinds debe ser un array con la misma longitud que paths' },
          { status: 400 }
        )
      }
      clipKinds = normalizeClipKindsInput(clipKindsRaw, paths.length)
      if (clipKinds.every((k) => k === 'visual_only')) {
        return NextResponse.json(
          { error: 'Al menos un clip debe ser con habla (spoken)' },
          { status: 400 }
        )
      }
    }

    let clipDurationsSec: (number | null)[] | undefined
    if (clipDurationsRaw !== undefined) {
      if (!Array.isArray(clipDurationsRaw) || clipDurationsRaw.length !== paths.length) {
        return NextResponse.json(
          { error: 'clipDurations debe ser un array con la misma longitud que paths' },
          { status: 400 }
        )
      }
      clipDurationsSec = normalizeClipDurationsInput(clipDurationsRaw, paths.length)
    }

    let voiceOverBaseClipIndex: number | undefined
    if (voiceOverRaw !== undefined && voiceOverRaw !== null) {
      if (paths.length < 2) {
        return NextResponse.json(
          { error: 'voiceOverBaseClipIndex solo aplica a jobs con al menos dos clips' },
          { status: 400 }
        )
      }
      const vo = normalizeVoiceOverBaseClipIndex(voiceOverRaw, paths.length)
      if (vo === undefined) {
        return NextResponse.json(
          { error: 'voiceOverBaseClipIndex debe ser un entero entre 0 y paths.length - 1' },
          { status: 400 }
        )
      }
      voiceOverBaseClipIndex = vo
    }

    const supabase = getServiceClient()

    // Obtener datos del job (music_track_url y flow_type)
    const { data: job, error: fetchError } = await supabase
      .from('video_jobs_v2')
      .select('flow_type, music_track_url')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    if (!job.music_track_url) {
      return NextResponse.json({ error: 'El job no tiene un track de música asignado' }, { status: 400 })
    }

    const pipelineInput: Json | undefined =
      clipKinds !== undefined || clipDurationsSec !== undefined || voiceOverBaseClipIndex !== undefined
        ? ({
            _v2_pipeline_input: true,
            ...(clipKinds !== undefined ? { clipKinds } : {}),
            ...(clipDurationsSec ? { clipDurationsSec } : {}),
            ...(voiceOverBaseClipIndex !== undefined ? { voiceOverBaseClipIndex } : {}),
          } as Json)
        : undefined

    // Actualizar paths en el job
    const { error: updateError } = await supabase
      .from('video_jobs_v2')
      .update({
        raw_video_paths: paths,
        status: 'uploading',
        current_step: 'Archivos recibidos. Iniciando pipeline...',
        progress_percentage: 20,
        ...(pipelineInput ? { selected_clips: pipelineInput } : {}),
      })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json(
        { error: `Error actualizando job: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Obtener URLs firmadas de los archivos ya subidos para el pipeline
    const signedUrls = await Promise.all(
      paths.map((path) => getSignedUrlForPath(path))
    )

    // Construir los "files" virtuales para el pipeline (solo necesita el buffer si hay compresión,
    // pero dado que el usuario ya subió directamente, pasamos los paths y el pipeline
    // generará sus propias URLs firmadas cuando las necesite)
    const flowType = job.flow_type as 'single' | 'multiple'
    const musicTrackUrl = job.music_track_url

    // Fire and forget: el pipeline lee los archivos desde Supabase Storage
    startPipelineFromPaths({
      jobId,
      flowType,
      paths,
      signedUrls,
      musicTrackUrl,
      clipKinds,
      clipDurationsSec,
      voiceOverBaseClipIndex,
    })

    return NextResponse.json({ jobId, status: 'processing' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Dispara el pipeline usando paths ya subidos en Storage (no buffers locales).
 * El pipeline leerá los archivos directamente desde Supabase usando URLs firmadas.
 */
function startPipelineFromPaths(params: {
  jobId: string
  flowType: 'single' | 'multiple'
  paths: string[]
  signedUrls: string[]
  musicTrackUrl: string
  clipKinds?: VideoClipKind[]
  clipDurationsSec?: (number | null)[]
  voiceOverBaseClipIndex?: number
}) {
  const { jobId, flowType, paths, signedUrls, musicTrackUrl, clipKinds, clipDurationsSec, voiceOverBaseClipIndex } =
    params

  // Pasamos buffers vacíos — el pipeline los ignorará porque los paths ya están en Storage.
  // El pipeline usará getSignedUrlForPath(path) internamente.
  const files = paths.map((path, i) => ({
    buffer: Buffer.alloc(0), // vacío — no se usa, el pipeline lee desde Storage
    filename: path.split('/').pop() ?? `clip_${i}.mp4`,
    mimeType: 'video/mp4',
    alreadyUploaded: true,
    path,
    signedUrl: signedUrls[i],
  }))

  startPipelineBackground({
    jobId,
    flowType,
    files,
    musicTrackUrl,
    clipKinds,
    clipDurationsSec,
    voiceOverBaseClipIndex,
  })
}
