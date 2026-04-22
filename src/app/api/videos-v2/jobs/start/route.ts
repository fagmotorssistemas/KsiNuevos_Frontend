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
  normalizeVoiceOverMp3OverlayIndices,
  normalizeManualIntroClipIndices,
  normalizeCanonicalVehicle,
} from '@/lib/videos-v2/clip-config'
import { extractScriptTextFromPdfBuffer } from '@/lib/videos-v2/extract-pdf-script-text'

const RAW_BUCKET = 'raw-videos-v2'

const VOICE_OVER_AUDIO_EXT = /\.(mp3|m4a|aac|wav)$/i

function isAllowedVoiceOverStoragePath(jobId: string, p: string): boolean {
  const s = p.trim()
  // Bucket música (admite audio); el cliente sube vía POST .../voice-over-audio
  if (s.startsWith(`reel-vo/${jobId}/`) && VOICE_OVER_AUDIO_EXT.test(s)) return true
  // Legacy: mismo bucket que vídeos (solo si el proyecto permite audio ahí)
  if (s.startsWith(`${jobId}/`) && VOICE_OVER_AUDIO_EXT.test(s)) return true
  return false
}

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
  /**
   * Con `voiceOverBaseClipIndex`: clips que van encima de la VO (solo vídeo; audio mute en ese bloque).
   * Orden = orden en timeline; emplanado lineal hasta cubrir la duración de la VO.
   */
  voiceOverOverlayClipIndices?: number[] | null
  /** Ruta en Storage del PDF de guion (mismo prefijo jobId/); opcional. */
  scriptPdfPath?: string | null
  /** Audio de voz en off (MP3/WAV/AAC/M4A) ya subido a Storage; excluyente con `voiceOverBaseClipIndex`. */
  voiceOverAudioPath?: string | null
  /** Duración del audio VO en segundos (p. ej. leída en el navegador). */
  voiceOverMp3DurationSec?: number | null
  /** Hasta 3 clips en orden, forzados al inicio del montaje (emergencia). */
  manualIntroClipIndices?: number[] | null
  /** Vehículo canónico para contexto en Gemini (inventario o captura manual). */
  canonicalVehicle?: { brand?: string; model?: string; year?: string } | null
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
      voiceOverOverlayClipIndices: overlayRaw,
      scriptPdfPath: scriptPdfPathRaw,
      voiceOverAudioPath: voiceOverAudioPathRaw,
      voiceOverMp3DurationSec: voiceOverMp3DurationRaw,
      manualIntroClipIndices: manualIntroRaw,
      canonicalVehicle: canonicalVehicleRaw,
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

    let voiceOverAudioPath: string | undefined
    if (voiceOverAudioPathRaw !== undefined && voiceOverAudioPathRaw !== null && String(voiceOverAudioPathRaw).trim() !== '') {
      const ap = String(voiceOverAudioPathRaw).trim()
      if (paths.length < 2) {
        return NextResponse.json(
          { error: 'voiceOverAudioPath solo aplica a jobs con al menos dos clips' },
          { status: 400 }
        )
      }
      if (voiceOverRaw !== undefined && voiceOverRaw !== null) {
        return NextResponse.json(
          { error: 'No combines voiceOverAudioPath con voiceOverBaseClipIndex' },
          { status: 400 }
        )
      }
      if (!isAllowedVoiceOverStoragePath(jobId, ap)) {
        return NextResponse.json(
          {
            error:
              'voiceOverAudioPath debe ser reel-vo/{jobId}/voice_over.* (subida por API) o {jobId}/... con extensión de audio',
          },
          { status: 400 }
        )
      }
      if (paths.includes(ap)) {
        return NextResponse.json(
          { error: 'voiceOverAudioPath no puede ser la misma ruta que un clip de vídeo' },
          { status: 400 }
        )
      }
      voiceOverAudioPath = ap
    }

    let voiceOverMp3DurationSec: number | undefined
    if (voiceOverAudioPath !== undefined) {
      const d =
        voiceOverMp3DurationRaw === null || voiceOverMp3DurationRaw === undefined
          ? NaN
          : Number(voiceOverMp3DurationRaw)
      if (!Number.isFinite(d) || d <= 0.2) {
        return NextResponse.json(
          {
            error:
              'Con voiceOverAudioPath debes enviar voiceOverMp3DurationSec (segundos, > 0.2), medido en el cliente al elegir el audio.',
          },
          { status: 400 }
        )
      }
      voiceOverMp3DurationSec = Number(d.toFixed(3))
    }

    let voiceOverOverlayClipIndices: number[] | undefined
    if (overlayRaw !== undefined && overlayRaw !== null) {
      if (!Array.isArray(overlayRaw)) {
        return NextResponse.json(
          { error: 'voiceOverOverlayClipIndices debe ser un array de enteros' },
          { status: 400 }
        )
      }
      if (overlayRaw.length > 0 && voiceOverBaseClipIndex === undefined && voiceOverAudioPath === undefined) {
        return NextResponse.json(
          { error: 'voiceOverOverlayClipIndices requiere voiceOverBaseClipIndex o voiceOverAudioPath' },
          { status: 400 }
        )
      }
      if (voiceOverAudioPath !== undefined && overlayRaw.length > 0) {
        const normMp3 = normalizeVoiceOverMp3OverlayIndices(overlayRaw, paths.length)
        if (!normMp3 || normMp3.length === 0) {
          return NextResponse.json(
            { error: 'voiceOverOverlayClipIndices no tiene índices válidos de clip' },
            { status: 400 }
          )
        }
        voiceOverOverlayClipIndices = normMp3
      }
      if (voiceOverBaseClipIndex !== undefined && overlayRaw.length > 0) {
        const norm = normalizeVoiceOverOverlayClipIndices(overlayRaw, paths.length, voiceOverBaseClipIndex)
        if (!norm || norm.length === 0) {
          return NextResponse.json(
            { error: 'voiceOverOverlayClipIndices no tiene índices válidos distintos del clip de VO' },
            { status: 400 }
          )
        }
        voiceOverOverlayClipIndices = norm
      }
    }

    if (voiceOverAudioPath !== undefined && voiceOverOverlayClipIndices !== undefined) {
      const uniq = new Set(voiceOverOverlayClipIndices)
      if (uniq.size >= paths.length) {
        return NextResponse.json(
          {
            error:
              'No puedes reservar todos los clips solo como planos sobre la VO: debe quedar al menos un clip para el montaje con habla.',
          },
          { status: 400 }
        )
      }
    }

    let manualIntroClipIndices: number[] | undefined
    if (manualIntroRaw !== undefined && manualIntroRaw !== null && Array.isArray(manualIntroRaw)) {
      if (manualIntroRaw.length > 0) {
        if (paths.length < 2) {
          return NextResponse.json(
            { error: 'manualIntroClipIndices solo aplica a jobs con al menos dos clips' },
            { status: 400 }
          )
        }
        const norm = normalizeManualIntroClipIndices(
          manualIntroRaw,
          paths.length,
          voiceOverBaseClipIndex,
          voiceOverOverlayClipIndices ?? []
        )
        if (!norm || norm.length === 0) {
          return NextResponse.json(
            {
              error:
                'manualIntroClipIndices: ningún índice válido (no puede ser el clip de VO ni un plano encima del VO).',
            },
            { status: 400 }
          )
        }
        manualIntroClipIndices = norm
      }
    }

    const canonicalVehicle = normalizeCanonicalVehicle(canonicalVehicleRaw ?? undefined)

    const supabase = getServiceClient()

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
      clipKinds !== undefined ||
      clipDurationsSec !== undefined ||
      voiceOverBaseClipIndex !== undefined ||
      voiceOverAudioPath !== undefined ||
      (voiceOverOverlayClipIndices !== undefined && voiceOverOverlayClipIndices.length > 0) ||
      (manualIntroClipIndices !== undefined && manualIntroClipIndices.length > 0) ||
      canonicalVehicle !== undefined
        ? ({
            _v2_pipeline_input: true,
            ...(clipKinds !== undefined ? { clipKinds } : {}),
            ...(clipDurationsSec ? { clipDurationsSec } : {}),
            ...(voiceOverBaseClipIndex !== undefined ? { voiceOverBaseClipIndex } : {}),
            ...(voiceOverOverlayClipIndices !== undefined && voiceOverOverlayClipIndices.length > 0
              ? { voiceOverOverlayClipIndices }
              : {}),
            ...(voiceOverAudioPath !== undefined ? { voiceOverAudioPath } : {}),
            ...(voiceOverMp3DurationSec !== undefined ? { voiceOverMp3DurationSec } : {}),
            ...(manualIntroClipIndices && manualIntroClipIndices.length > 0
              ? { manualIntroClipIndices }
              : {}),
            ...(canonicalVehicle ? { canonicalVehicle } : {}),
          } as unknown as Json)
        : undefined

    const scriptDbFields =
      scriptPdfPathRaw != null && String(scriptPdfPathRaw).trim() !== ''
        ? { script_pdf_path: scriptPdfPathCol, script_text: scriptTextCol }
        : {}

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

    const signedUrls = await Promise.all(paths.map((path) => getSignedUrlForPath(path)))

    const flowType = job.flow_type as 'single' | 'multiple'
    const musicTrackUrl = job.music_track_url

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
      voiceOverAudioPath,
      voiceOverMp3DurationSec,
    })

    return NextResponse.json({ jobId, status: 'processing' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
  voiceOverAudioPath?: string
  voiceOverMp3DurationSec?: number
}) {
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
    voiceOverAudioPath,
    voiceOverMp3DurationSec,
  } = params

  const files = paths.map((path, i) => ({
    buffer: Buffer.alloc(0),
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
    voiceOverAudioPath,
    voiceOverMp3DurationSec,
  })
}
