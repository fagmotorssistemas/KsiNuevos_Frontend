/**
 * POST /api/videos-v2/jobs/start
 *
 * Recibe el jobId y los paths de los archivos ya subidos a Supabase Storage.
 * Actualiza el job con los paths y dispara el pipeline en background.
 *
 * Body JSON: { jobId, paths: string[], clipKinds?, clipDurations?, voiceOverBaseClipIndex?, voiceOverOverlayClipIndices?, scriptPdfPath? }
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
  normalizeVoiceOverOverlayClipIndices,
} from '@/lib/videos-v2/clip-config'
import { extractScriptTextFromPdfBuffer } from '@/lib/videos-v2/extract-pdf-script-text'

const RAW_BUCKET = 'raw-videos-v2'

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
  /** Índice del clip cuyo audio completo va como voz en off (solo múltiple; debe tener habla detectada). */
  voiceOverBaseClipIndex?: number | null
<<<<<<< HEAD
  /** Índices de clips que van como B-roll visual encima del VO, en el orden elegido (sin audio). */
=======
  /**
   * Con `voiceOverBaseClipIndex`: orden de clips que van encima de la VO (solo vídeo; audio mute en render).
   * Emplanado lineal hasta cubrir la duración de la VO.
   */
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
  voiceOverOverlayClipIndices?: number[] | null
  /** Ruta en Storage del PDF de guion (mismo prefijo jobId/); opcional. */
  scriptPdfPath?: string | null
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
<<<<<<< HEAD
      voiceOverOverlayClipIndices: overlayRaw,
=======
      voiceOverOverlayClipIndices: voOverlayRaw,
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
      scriptPdfPath: scriptPdfPathRaw,
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

    let voiceOverOverlayClipIndices: number[] | undefined
<<<<<<< HEAD
    if (overlayRaw !== undefined && overlayRaw !== null) {
      voiceOverOverlayClipIndices = normalizeVoiceOverOverlayClipIndices(
        overlayRaw,
        paths.length,
        voiceOverBaseClipIndex
      )
=======
    if (voOverlayRaw !== undefined && voOverlayRaw !== null) {
      if (!Array.isArray(voOverlayRaw)) {
        return NextResponse.json(
          { error: 'voiceOverOverlayClipIndices debe ser un array de enteros' },
          { status: 400 }
        )
      }
      if (voOverlayRaw.length > 0 && voiceOverBaseClipIndex === undefined) {
        return NextResponse.json(
          { error: 'voiceOverOverlayClipIndices requiere voiceOverBaseClipIndex' },
          { status: 400 }
        )
      }
      if (voiceOverBaseClipIndex !== undefined && voOverlayRaw.length > 0) {
        const norm = normalizeVoiceOverOverlayClipIndices(voOverlayRaw, paths.length, voiceOverBaseClipIndex)
        if (norm.length === 0) {
          return NextResponse.json(
            { error: 'voiceOverOverlayClipIndices no tiene índices válidos distintos del clip de VO' },
            { status: 400 }
          )
        }
        voiceOverOverlayClipIndices = norm
      }
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
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

    let scriptPdfPathCol: string | null = null
    let scriptTextCol: string | null = null
    if (scriptPdfPathRaw != null && String(scriptPdfPathRaw).trim() !== '') {
      const sp = String(scriptPdfPathRaw).trim()
      if (!sp.startsWith(`${jobId}/`)) {
        return NextResponse.json({ error: 'Ruta del guion inválida' }, { status: 400 })
      }
      if (!sp.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json({ error: 'El guion debe ser un archivo PDF' }, { status: 400 })
      }
      if (paths.includes(sp)) {
        return NextResponse.json({ error: 'La ruta del guion no puede coincidir con un clip de vídeo' }, { status: 400 })
      }
      const { data: scriptBlob, error: scriptDlError } = await supabase.storage.from(RAW_BUCKET).download(sp)
      if (scriptDlError || !scriptBlob) {
        console.warn(
          `[VideoV2][/jobs/start] No se pudo descargar el PDF del guion (${sp}): ${scriptDlError?.message ?? 'sin blob'}`
        )
      } else {
        try {
          const buf = Buffer.from(await scriptBlob.arrayBuffer())
          const extracted = await extractScriptTextFromPdfBuffer(buf)
          scriptPdfPathCol = sp
          scriptTextCol = extracted.length > 0 ? extracted : null
        } catch (pdfErr) {
          console.warn(`[VideoV2][/jobs/start] Error extrayendo texto del PDF del guion: ${pdfErr}`)
          scriptPdfPathCol = sp
          scriptTextCol = null
        }
      }
    }

    const pipelineInput: Json | undefined =
<<<<<<< HEAD
      clipKinds !== undefined || clipDurationsSec !== undefined || voiceOverBaseClipIndex !== undefined || voiceOverOverlayClipIndices !== undefined
=======
      clipKinds !== undefined ||
      clipDurationsSec !== undefined ||
      voiceOverBaseClipIndex !== undefined ||
      (voiceOverOverlayClipIndices !== undefined && voiceOverOverlayClipIndices.length > 0)
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
        ? ({
            _v2_pipeline_input: true,
            ...(clipKinds !== undefined ? { clipKinds } : {}),
            ...(clipDurationsSec ? { clipDurationsSec } : {}),
            ...(voiceOverBaseClipIndex !== undefined ? { voiceOverBaseClipIndex } : {}),
<<<<<<< HEAD
            ...(voiceOverOverlayClipIndices !== undefined ? { voiceOverOverlayClipIndices } : {}),
=======
            ...(voiceOverOverlayClipIndices !== undefined && voiceOverOverlayClipIndices.length > 0
              ? { voiceOverOverlayClipIndices }
              : {}),
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
          } as Json)
        : undefined

    /** Solo tocar columnas de guion si el cliente envió scriptPdfPath (evita error si la DB aún no tiene la migración). */
    const scriptDbFields =
      scriptPdfPathRaw != null && String(scriptPdfPathRaw).trim() !== ''
        ? { script_pdf_path: scriptPdfPathCol, script_text: scriptTextCol }
        : {}

    // Actualizar paths en el job
    const { error: updateError } = await supabase
      .from('video_jobs_v2')
      .update({
        raw_video_paths: paths,
        status: 'uploading',
        current_step: 'Archivos recibidos. Iniciando pipeline...',
        progress_percentage: 20,
        ...(pipelineInput ? { selected_clips: pipelineInput } : {}),
        ...scriptDbFields,
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
      voiceOverOverlayClipIndices,
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
  voiceOverOverlayClipIndices?: number[]
}) {
<<<<<<< HEAD
  const { jobId, flowType, paths, signedUrls, musicTrackUrl, clipKinds, clipDurationsSec, voiceOverBaseClipIndex, voiceOverOverlayClipIndices } =
    params
=======
  const {
    jobId,
    flowType,
    paths,
    signedUrls,
    musicTrackUrl,
    clipKinds,
    clipDurationsSec,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices,
  } = params
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c

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
    voiceOverOverlayClipIndices,
  })
}
