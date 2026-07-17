/**
 * Lógica compartida de POST /jobs/start y POST /jobs/[jobId]/finalize
 */

import { dispatchVideoPipelineRun } from '@/lib/videos/dispatch-pipeline-run'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import type { VideoClipKind } from '@/lib/videos/clip-config'
import {
  normalizeClipKindsInput,
  normalizeClipDurationsInput,
  normalizeVoiceOverBaseClipIndex,
  normalizeVoiceOverOverlayClipIndices,
  normalizeVoiceOverMp3OverlayIndices,
  normalizeManualIntroClipIndices,
  normalizeManualClipOrderIndices,
  normalizeCanonicalVehicle,
  normalizeMusicTrimStartSec,
  normalizeReelAudioVolume,
  resolveClipOrientationsForPaths,
} from '@/lib/videos/clip-config'
import {
  normalizeClipOrientationsInput,
  type ClipOrientationMeta,
} from '@/lib/videos/video-orientation'
import { extractScriptTextFromPdfBuffer } from '@/lib/videos/extract-pdf-script-text'

const RAW_BUCKET = 'raw-videos-v2'

const VOICE_OVER_AUDIO_EXT = /\.(mp3|m4a|aac|wav)$/i

function isAllowedVoiceOverStoragePath(jobId: string, p: string): boolean {
  const s = p.trim()
  if (s.startsWith(`reel-vo/${jobId}/`) && VOICE_OVER_AUDIO_EXT.test(s)) return true
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

export interface StartJobBody {
  jobId: string
  paths: string[]
  clipKinds?: string[]
  clipDurations?: Array<number | null>
  voiceOverBaseClipIndex?: number | null
  voiceOverOverlayClipIndices?: number[] | null
  scriptPdfPath?: string | null
  voiceOverAudioPath?: string | null
  voiceOverMp3DurationSec?: number | null
  manualIntroClipIndices?: number[] | null
  manualClipOrderIndices?: number[] | null
  forceAllManualOrderClips?: boolean | null
  canonicalVehicle?: { brand?: string; model?: string; year?: string } | null
  vehicleId?: string | null
  musicTrimStartSec?: number | null
  reelMusicVolume?: number | null
  reelDialogueVolume?: number | null
  /** Probe de orientación en navegador (mismo orden que paths). */
  clipOrientations?: ClipOrientationMeta[] | null
}

export type JobStartResult =
  | { ok: true; jobId: string; status: 'processing' }
  | { ok: false; error: string; status: number }

function schedulePipelineRun(jobId: string) {
  dispatchVideoPipelineRun(jobId)
}

export async function executeJobStart(body: StartJobBody): Promise<JobStartResult> {
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
    manualClipOrderIndices: manualClipOrderRaw,
    forceAllManualOrderClips: forceAllManualOrderClipsRaw,
    canonicalVehicle: canonicalVehicleRaw,
    vehicleId: vehicleIdRaw,
    musicTrimStartSec: musicTrimStartRaw,
    reelMusicVolume: reelMusicVolumeRaw,
    reelDialogueVolume: reelDialogueVolumeRaw,
    clipOrientations: clipOrientationsRaw,
  } = body

  if (!jobId || !paths?.length) {
    return { ok: false, error: 'jobId y paths son requeridos', status: 400 }
  }

  let clipKinds: VideoClipKind[] | undefined
  if (clipKindsRaw !== undefined) {
    if (!Array.isArray(clipKindsRaw) || clipKindsRaw.length !== paths.length) {
      return {
        ok: false,
        error: 'clipKinds debe ser un array con la misma longitud que paths',
        status: 400,
      }
    }
    clipKinds = normalizeClipKindsInput(clipKindsRaw, paths.length)
    if (clipKinds.every((k) => k === 'visual_only')) {
      return { ok: false, error: 'Al menos un clip debe ser con habla (spoken)', status: 400 }
    }
  }

  let clipDurationsSec: (number | null)[] | undefined
  if (clipDurationsRaw !== undefined) {
    if (!Array.isArray(clipDurationsRaw) || clipDurationsRaw.length !== paths.length) {
      return {
        ok: false,
        error: 'clipDurations debe ser un array con la misma longitud que paths',
        status: 400,
      }
    }
    clipDurationsSec = normalizeClipDurationsInput(clipDurationsRaw, paths.length)
  }

  let voiceOverBaseClipIndex: number | undefined
  if (voiceOverRaw !== undefined && voiceOverRaw !== null) {
    if (paths.length < 2) {
      return {
        ok: false,
        error: 'voiceOverBaseClipIndex solo aplica a jobs con al menos dos clips',
        status: 400,
      }
    }
    const vo = normalizeVoiceOverBaseClipIndex(voiceOverRaw, paths.length)
    if (vo === undefined) {
      return {
        ok: false,
        error: 'voiceOverBaseClipIndex debe ser un entero entre 0 y paths.length - 1',
        status: 400,
      }
    }
    voiceOverBaseClipIndex = vo
  }

  let voiceOverAudioPath: string | undefined
  if (
    voiceOverAudioPathRaw !== undefined &&
    voiceOverAudioPathRaw !== null &&
    String(voiceOverAudioPathRaw).trim() !== ''
  ) {
    const ap = String(voiceOverAudioPathRaw).trim()
    if (paths.length < 2) {
      return {
        ok: false,
        error: 'voiceOverAudioPath solo aplica a jobs con al menos dos clips',
        status: 400,
      }
    }
    if (voiceOverRaw !== undefined && voiceOverRaw !== null) {
      return { ok: false, error: 'No combines voiceOverAudioPath con voiceOverBaseClipIndex', status: 400 }
    }
    if (!isAllowedVoiceOverStoragePath(jobId, ap)) {
      return {
        ok: false,
        error:
          'voiceOverAudioPath debe ser reel-vo/{jobId}/voice_over.* (subida por API) o {jobId}/... con extensión de audio',
        status: 400,
      }
    }
    if (paths.includes(ap)) {
      return { ok: false, error: 'voiceOverAudioPath no puede ser la misma ruta que un clip de vídeo', status: 400 }
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
      return {
        ok: false,
        error:
          'Con voiceOverAudioPath debes enviar voiceOverMp3DurationSec (segundos, > 0.2), medido en el cliente al elegir el audio.',
        status: 400,
      }
    }
    voiceOverMp3DurationSec = Number(d.toFixed(3))
  }

  let voiceOverOverlayClipIndices: number[] | undefined
  if (overlayRaw !== undefined && overlayRaw !== null) {
    if (!Array.isArray(overlayRaw)) {
      return { ok: false, error: 'voiceOverOverlayClipIndices debe ser un array de enteros', status: 400 }
    }
    if (overlayRaw.length > 0 && voiceOverBaseClipIndex === undefined && voiceOverAudioPath === undefined) {
      return {
        ok: false,
        error: 'voiceOverOverlayClipIndices requiere voiceOverBaseClipIndex o voiceOverAudioPath',
        status: 400,
      }
    }
    if (voiceOverAudioPath !== undefined && overlayRaw.length > 0) {
      const normMp3 = normalizeVoiceOverMp3OverlayIndices(overlayRaw, paths.length)
      if (!normMp3 || normMp3.length === 0) {
        return { ok: false, error: 'voiceOverOverlayClipIndices no tiene índices válidos de clip', status: 400 }
      }
      voiceOverOverlayClipIndices = normMp3
    }
    if (voiceOverBaseClipIndex !== undefined && overlayRaw.length > 0) {
      const norm = normalizeVoiceOverOverlayClipIndices(overlayRaw, paths.length, voiceOverBaseClipIndex)
      if (!norm || norm.length === 0) {
        return {
          ok: false,
          error: 'voiceOverOverlayClipIndices no tiene índices válidos distintos del clip de VO',
          status: 400,
        }
      }
      voiceOverOverlayClipIndices = norm
    }
  }

  if (voiceOverAudioPath !== undefined && voiceOverOverlayClipIndices !== undefined) {
    const uniq = new Set(voiceOverOverlayClipIndices)
    if (uniq.size >= paths.length) {
      return {
        ok: false,
        error:
          'No puedes reservar todos los clips solo como planos sobre la VO: debe quedar al menos un clip para el montaje con habla.',
        status: 400,
      }
    }
  }

  let manualIntroClipIndices: number[] | undefined
  if (manualIntroRaw !== undefined && manualIntroRaw !== null && Array.isArray(manualIntroRaw)) {
    if (manualIntroRaw.length > 0) {
      if (paths.length < 2) {
        return { ok: false, error: 'manualIntroClipIndices solo aplica a jobs con al menos dos clips', status: 400 }
      }
      const norm = normalizeManualIntroClipIndices(
        manualIntroRaw,
        paths.length,
        voiceOverBaseClipIndex,
        voiceOverOverlayClipIndices ?? []
      )
      if (!norm || norm.length === 0) {
        return {
          ok: false,
          error:
            'manualIntroClipIndices: ningún índice válido (no puede ser el clip de VO ni un plano encima del VO).',
          status: 400,
        }
      }
      manualIntroClipIndices = norm
    }
  }

  let manualClipOrderIndices: number[] | undefined
  if (manualClipOrderRaw !== undefined && manualClipOrderRaw !== null && Array.isArray(manualClipOrderRaw)) {
    if (manualClipOrderRaw.length > 0) {
      if (paths.length < 2) {
        return { ok: false, error: 'manualClipOrderIndices solo aplica a jobs con al menos dos clips', status: 400 }
      }
      const normOrder = normalizeManualClipOrderIndices(
        manualClipOrderRaw,
        paths.length,
        voiceOverBaseClipIndex,
        voiceOverOverlayClipIndices ?? []
      )
      if (!normOrder || normOrder.length === 0) {
        return {
          ok: false,
          error:
            'manualClipOrderIndices debe ser una permutación exacta de los clips del montaje (todos los índices excepto VO y planos encima del VO).',
          status: 400,
        }
      }
      manualClipOrderIndices = normOrder
    }
  }

  if (
    manualClipOrderIndices !== undefined &&
    manualClipOrderIndices.length > 0 &&
    manualIntroClipIndices !== undefined &&
    manualIntroClipIndices.length > 0
  ) {
    return { ok: false, error: 'No combines manualClipOrderIndices con manualIntroClipIndices', status: 400 }
  }

  let forceAllManualOrderClips = false
  if (forceAllManualOrderClipsRaw === true) {
    if (!manualClipOrderIndices || manualClipOrderIndices.length === 0) {
      return { ok: false, error: 'forceAllManualOrderClips requiere manualClipOrderIndices activo', status: 400 }
    }
    forceAllManualOrderClips = true
  }

  const canonicalVehicle = normalizeCanonicalVehicle(canonicalVehicleRaw ?? undefined)
  const vehicleId =
    vehicleIdRaw != null && String(vehicleIdRaw).trim() !== '' ? String(vehicleIdRaw).trim() : undefined
  const musicTrimStartSec = normalizeMusicTrimStartSec(musicTrimStartRaw ?? undefined)
  const reelMusicVolume = normalizeReelAudioVolume(reelMusicVolumeRaw ?? undefined)
  const reelDialogueVolume = normalizeReelAudioVolume(reelDialogueVolumeRaw ?? undefined)
  const clipOrientations = normalizeClipOrientationsInput(clipOrientationsRaw ?? undefined, paths.length)

  const supabase = getServiceClient()

  const { data: job, error: fetchError } = await supabase
    .from('video_jobs_v2')
    .select('flow_type, music_track_url, selected_clips')
    .eq('id', jobId)
    .single()

  if (fetchError || !job) {
    return { ok: false, error: 'Job no encontrado', status: 404 }
  }

  if (!job.music_track_url) {
    return { ok: false, error: 'El job no tiene un track de música asignado', status: 400 }
  }

  let scriptPdfPathCol: string | null = null
  let scriptTextCol: string | null = null
  if (scriptPdfPathRaw != null && String(scriptPdfPathRaw).trim() !== '') {
    const sp = String(scriptPdfPathRaw).trim()
    if (!sp.startsWith(`${jobId}/`)) {
      return { ok: false, error: 'Ruta del guion inválida', status: 400 }
    }
    if (!sp.toLowerCase().endsWith('.pdf')) {
      return { ok: false, error: 'El guion debe ser un archivo PDF', status: 400 }
    }
    if (paths.includes(sp)) {
      return { ok: false, error: 'La ruta del guion no puede coincidir con un clip de vídeo', status: 400 }
    }
    const { data: scriptBlob, error: scriptDlError } = await supabase.storage.from(RAW_BUCKET).download(sp)
    if (scriptDlError || !scriptBlob) {
      console.warn(
        `[VideoV2][executeJobStart] No se pudo descargar el PDF del guion (${sp}): ${scriptDlError?.message ?? 'sin blob'}`
      )
    } else {
      try {
        const buf = Buffer.from(await scriptBlob.arrayBuffer())
        const extracted = await extractScriptTextFromPdfBuffer(buf)
        scriptPdfPathCol = sp
        scriptTextCol = extracted.length > 0 ? extracted : null
      } catch (pdfErr) {
        console.warn(`[VideoV2][executeJobStart] Error extrayendo texto del PDF del guion: ${pdfErr}`)
        scriptPdfPathCol = sp
        scriptTextCol = null
      }
    }
  }

  // Conservar orientaciones ya guardadas en biblioteca si el start no trae probe.
  let resolvedOrientations = clipOrientations
  if (!resolvedOrientations) {
    resolvedOrientations = resolveClipOrientationsForPaths(job.selected_clips, paths)
  }

  const pipelineInput: Json | undefined =
    clipKinds !== undefined ||
    clipDurationsSec !== undefined ||
    voiceOverBaseClipIndex !== undefined ||
    voiceOverAudioPath !== undefined ||
    (voiceOverOverlayClipIndices !== undefined && voiceOverOverlayClipIndices.length > 0) ||
    (manualIntroClipIndices !== undefined && manualIntroClipIndices.length > 0) ||
    (manualClipOrderIndices !== undefined && manualClipOrderIndices.length > 0) ||
    forceAllManualOrderClips ||
    canonicalVehicle !== undefined ||
    vehicleId !== undefined ||
    musicTrimStartSec !== undefined ||
    reelMusicVolume !== undefined ||
    reelDialogueVolume !== undefined ||
    resolvedOrientations !== undefined
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
          ...(manualIntroClipIndices && manualIntroClipIndices.length > 0 ? { manualIntroClipIndices } : {}),
          ...(manualClipOrderIndices && manualClipOrderIndices.length > 0 ? { manualClipOrderIndices } : {}),
          ...(forceAllManualOrderClips ? { forceAllManualOrderClips: true } : {}),
          ...(canonicalVehicle ? { canonicalVehicle } : {}),
          ...(vehicleId ? { vehicleId } : {}),
          ...(musicTrimStartSec !== undefined ? { musicTrimStartSec } : {}),
          ...(reelMusicVolume !== undefined ? { reelMusicVolume } : {}),
          ...(reelDialogueVolume !== undefined ? { reelDialogueVolume } : {}),
          ...(resolvedOrientations
            ? {
                clipOrientations: resolvedOrientations,
                clipOrientationsByPath: Object.fromEntries(
                  paths.map((p, i) => [p, resolvedOrientations[i]!])
                ),
              }
            : {}),
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
      ...(vehicleId ? { inventory_vehicle_id: vehicleId } : {}),
      ...scriptDbFields,
    })
    .eq('id', jobId)

  if (updateError) {
    return { ok: false, error: `Error actualizando job: ${updateError.message}`, status: 500 }
  }

  schedulePipelineRun(jobId)

  return { ok: true, jobId, status: 'processing' }
}
