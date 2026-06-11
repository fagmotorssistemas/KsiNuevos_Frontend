import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType, GeminiSegmentAnalysisResult, VideoJobStatus } from './types'
import { getSignedUrlForPath, resolveVoiceOverAudioUrl } from './storage'
import { transcribeVideoV2, type RawWord } from './assemblyai'
import {
  buildAdjustedSRT,
  buildAdjustedSRTForVoiceOverIntro,
  buildAdjustedSrtFromSubtitleBlocks,
  buildSubtitleBlocks,
  buildSubtitleBlocksForExternalVoiceOver,
  buildSubtitleBlocksFromRawWords,
  buildSubtitleBlocksForVoiceOverIntro,
  buildVisualOnlyPlaceholderSegment,
  clampSequenceToSegmentBounds,
  formatSegmentMapForPrompt,
  offsetSubtitleBlocks,
  refineSpokenSegmentsForOneClip,
  sumSequenceItemsDurationSec,
} from './segmenter'
import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import type { VideoClipKind, CanonicalVehicleMeta } from './clip-config'
import {
  defaultClipKinds,
  isPipelineInputMeta,
  normalizeClipDurationsInput,
  normalizeClipKindsInput,
  normalizeCanonicalVehicle,
  normalizeManualIntroClipIndices,
  normalizeMusicTrimStartSec,
  normalizeVoiceOverMp3OverlayIndices,
  normalizeVoiceOverOverlayClipIndices,
  normalizeManualClipOrderIndices,
} from './clip-config'
import { extractQuotedDialoguesFromScript } from './script-dialogues'
import {
  applyScreenTextFromGuion,
  applyScreenTextFromGuionSequence,
  buildCaptionBlocksFromDialogoAssembly,
  parseEscenaNumberFromSequenceReason,
} from './subtitle-screen-text'
import {
  loadGuionEscenasForJob,
  resolveAndLinkVideoScriptForJob,
} from './video-script-resolve'
import { resolveAndApplyVehicleFromAssemblyForJob } from './resolve-vehicle-from-assembly'
import { suppressDuplicateBrandMentionSubtitles } from './suppress-duplicate-brand-subtitles'
import { fetchDriveBadgeForJob } from './drive-badge'
import { normalizeDriveSubtitleBlocks } from './normalize-drive-subtitles'
import { applyComentaFromAssembly } from './detect-comenta-from-assembly'
import { applyCaptionHighlights } from './highlight-engine'
import type { BrandConfig } from './creatomate'
import { formatAssemblyTranscriptDumpForPrompt } from './assembly-transcript-prompt'
import { tryProbeVideoDurationSecondsFromUrl } from './probe-video'
import {
  analyzeSegments,
  buildForcedManualOrderClipAnalysis,
  buildValidatedAnalysisFromGuionSequence,
  type AnalyzeSegmentsOptions,
} from './gemini'
import {
  logGuionDialogueMatchMatrix,
  tryBuildSequenceFromGuionDialogues,
} from './guion-sequence'
import { dialogueLinesFromGuionEscenas, type GuionEscena } from '@/types/video-script'
import {
  buildCreatomateRenderScript,
  computeReelTimelineMeta,
  getCreatomateRenderStatus,
  submitCreatomateRenderForJob,
  brandConfigFromJobRow,
  type BrandConfigJobRow,
  type CreatomateFlatRenderScript,
  VOICE_OVER_EXTERNAL_CLIP_INDEX,
  type VoiceOverIntroRenderInput,
} from './creatomate'
import { renderSegmentsV2, getShotstackRenderStatus } from './shotstack'
import { pickSmartMusicTrimStartSec } from './smart-music-trim'
import { buildSemanticVoiceOverBrollTiles, planLinearBrollTiling } from './vo-broll-semantics'
import {
  prepareVideoForGemini,
  prepareMultipleVideosForGemini,
  cleanupGoogleFile,
  cleanupMultipleGoogleFiles,
} from './google-file-api'
import type { GoogleFileRef } from './google-file-api'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function vehicleIdFromPipelineMeta(selectedClips: unknown): string | null {
  if (!isPipelineInputMeta(selectedClips)) return null
  const id = selectedClips.vehicleId?.trim()
  return id || null
}

async function fetchJobGeminiContext(jobId: string): Promise<{
  scriptText: string | null
  canonicalVehicle?: CanonicalVehicleMeta
  vehicleId?: string | null
  manualIntroClipIndicesRaw?: number[]
  manualClipOrderIndicesRaw?: number[]
  forceAllManualOrderClips?: boolean
}> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('video_jobs_v2')
    .select('script_text, selected_clips')
    .eq('id', jobId)
    .single()
  if (error || !data) return { scriptText: null }
  const scriptText = data.script_text?.trim() || null
  let canonicalVehicle: CanonicalVehicleMeta | undefined
  let manualIntroClipIndicesRaw: number[] | undefined
  let manualClipOrderIndicesRaw: number[] | undefined
  let forceAllManualOrderClips = false
  const vehicleId = vehicleIdFromPipelineMeta(data.selected_clips)
  const sc = data.selected_clips
  if (isPipelineInputMeta(sc)) {
    canonicalVehicle = normalizeCanonicalVehicle(sc.canonicalVehicle)
    forceAllManualOrderClips = sc.forceAllManualOrderClips === true
    if (Array.isArray(sc.manualIntroClipIndices) && sc.manualIntroClipIndices.length > 0) {
      const coerced = sc.manualIntroClipIndices
        .map((x) => (typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN))
        .filter((n) => Number.isInteger(n) && n >= 0)
      if (coerced.length > 0) manualIntroClipIndicesRaw = coerced
    }
    if (Array.isArray(sc.manualClipOrderIndices) && sc.manualClipOrderIndices.length > 0) {
      const coercedOrder = sc.manualClipOrderIndices
        .map((x) => (typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN))
        .filter((n) => Number.isInteger(n) && n >= 0)
      if (coercedOrder.length > 0) manualClipOrderIndicesRaw = coercedOrder
    }
  }
  return {
    scriptText,
    canonicalVehicle,
    vehicleId,
    manualIntroClipIndicesRaw,
    manualClipOrderIndicesRaw,
    forceAllManualOrderClips,
  }
}

async function loadGuionEscenasForPipelineJob(
  jobId: string,
  allSegments: Segment[]
): Promise<GuionEscena[]> {
  const supabase = getServiceClient()
  const { data: jobRow } = await supabase
    .from('video_jobs_v2')
    .select('video_script_id, selected_clips, script_text')
    .eq('id', jobId)
    .single()

  let escenas = await loadGuionEscenasForJob(supabase, jobRow?.video_script_id)
  if (escenas.length === 0 && !jobRow?.script_text?.trim()) {
    const vehicleId = vehicleIdFromPipelineMeta(jobRow?.selected_clips)
    const resolved = await resolveAndLinkVideoScriptForJob(
      supabase,
      jobId,
      allSegments,
      vehicleId
    )
    escenas = resolved?.escenas ?? []
  }
  return escenas
}

type GuionSequenceAttemptOpts = {
  excludedClipIndices: number[]
  clipKinds: VideoClipKind[]
  manualClipOrder: number[] | null | undefined
  manualIntro: number[] | null | undefined
  voiceOverBaseClipIndex?: number | null
  voiceOverFromMp3?: boolean
}

/**
 * Orden determinista: cada diálogo del guión (tabla) → segment_id Assembly, en orden de escena.
 * Evita que validateSequence reordene con heurísticas de "apertura" / intro / CTA.
 */
function tryAnalysisFromGuionDialogues(
  jobId: string,
  allSegments: Segment[],
  escenas: GuionEscena[],
  opts: GuionSequenceAttemptOpts
): GeminiSegmentAnalysisResult | null {
  if (opts.manualClipOrder && opts.manualClipOrder.length > 0) {
    console.log(`[VideoV2Pipeline][${jobId}][GuionSeq] Omitido: orden manual de clips activo`)
    return null
  }
  if (opts.manualIntro && opts.manualIntro.length > 0) {
    console.log(`[VideoV2Pipeline][${jobId}][GuionSeq] Omitido: intro manual activa`)
    return null
  }

  const dialogues = dialogueLinesFromGuionEscenas(escenas)
  console.log(
    `[VideoV2Pipeline][${jobId}][GuionSeq] ${escenas.length} escenas, ${dialogues.length} diálogos con texto`
  )

  const guionSequence = tryBuildSequenceFromGuionDialogues(escenas, allSegments, {
    excludedClipIndices: opts.excludedClipIndices,
    jobId,
  })
  if (!guionSequence || guionSequence.length === 0) {
    console.warn(`[VideoV2Pipeline][${jobId}][GuionSeq] No se pudo armar secuencia → fallback Gemini`)
    return null
  }

  const validateOpts: Parameters<typeof buildValidatedAnalysisFromGuionSequence>[4] = {}
  if (opts.voiceOverBaseClipIndex != null) {
    validateOpts.excludeClipIndicesFromSequence = [opts.voiceOverBaseClipIndex]
    validateOpts.disableVisualOverlayNormalization = true
    validateOpts.manualVoiceOverBaseClipIndex = opts.voiceOverBaseClipIndex
  } else if (opts.voiceOverFromMp3) {
    validateOpts.excludeClipIndicesFromSequence = opts.excludedClipIndices
    validateOpts.disableVisualOverlayNormalization = true
    validateOpts.manualVoiceOverFromExternalAudio = true
  }

  const analysis = buildValidatedAnalysisFromGuionSequence(
    guionSequence,
    allSegments,
    jobId,
    opts.clipKinds,
    validateOpts
  )
  console.log(
    `[VideoV2Pipeline][${jobId}][GuionSeq] Montaje final por guión: ${analysis.sequence.length} cortes, ` +
      `${analysis.total_duration.toFixed(1)}s — ${analysis.sequence.map((s) => `clip${s.clip_index}`).join(' → ')}`
  )
  return analysis
}

async function finalizeSubtitleBlocksForJob(
  jobId: string,
  blocks: SubtitleBlock[],
  allSegments: Segment[],
  sequence?: SequenceItem[]
): Promise<SubtitleBlock[]> {
  const supabase = getServiceClient()
  const { data: jobRow } = await supabase
    .from('video_jobs_v2')
    .select('video_script_id, selected_clips')
    .eq('id', jobId)
    .single()

  const vehicleId = vehicleIdFromPipelineMeta(jobRow?.selected_clips)
  let escenas = await loadGuionEscenasForJob(supabase, jobRow?.video_script_id)
  if (escenas.length === 0) {
    const resolved = await resolveAndLinkVideoScriptForJob(
      supabase,
      jobId,
      allSegments,
      vehicleId
    )
    escenas = resolved?.escenas ?? []
  }
  if (escenas.length === 0) return blocks

  const sequenceFromGuion =
    sequence &&
    sequence.length > 0 &&
    sequence.some((s) => parseEscenaNumberFromSequenceReason(s.reason) != null)

  if (sequenceFromGuion && sequence) {
    const aligned = applyScreenTextFromGuionSequence(sequence, escenas, jobId)
    if (aligned.length > 0) {
      console.log(
        `[VideoV2Pipeline][${jobId}] Subtítulos: ${aligned.length} texto_pantalla alineados al montaje (sin solapar)`
      )
      return aligned
    }
    console.warn(
      `[VideoV2Pipeline][${jobId}] Subtítulos: secuencia por guión sin texto_pantalla aplicable, fallback jaccard`
    )
  }

  const finalBlocks = applyScreenTextFromGuion(blocks, escenas)
  console.log(
    `[VideoV2Pipeline][${jobId}] Subtítulos: ${blocks.length} bloques Assembly → ${finalBlocks.length} con texto_pantalla del guión`
  )
  return finalBlocks.length > 0 ? finalBlocks : blocks
}

async function updateJob(
  jobId: string,
  fields: Partial<{
    status: VideoJobStatus
    current_step: string
    progress_percentage: number
    error_message: string | null
    assemblyai_transcript_id: string
    srt_content: string
    gemini_analysis: unknown
    creatomate_render_id: string
    final_video_url: string | null
    final_video_duration: number | null
    raw_video_paths: string[]
    selected_clips: unknown
    segment_map: unknown
    adjusted_srt: string
    subtitle_blocks_override: unknown
    music_track_url: string
  }>
) {
  const supabase = getServiceClient()
  const payload = { ...fields } as Record<string, unknown>
  if (fields.status === 'completed') {
    const { data: prev } = await supabase
      .from('video_jobs_v2')
      .select('social_publish_stage')
      .eq('id', jobId)
      .single()
    payload.social_publish_stage = prev?.social_publish_stage ?? 'generado'
  }
  const { error } = await supabase.from('video_jobs_v2').update(payload).eq('id', jobId)

  if (error) {
    console.error(`[VideoV2Pipeline][${jobId}] Error actualizando job: ${error.message}`)
    throw new Error(`No se pudo actualizar el job: ${error.message}`)
  }
}

async function resolveMusicTrackUrlById(musicTrackId: string): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('music_tracks_v2')
    .select('public_url, is_active')
    .eq('id', musicTrackId)
    .single()
  if (error || !data?.public_url) {
    throw new Error('No se encontró el track de música seleccionado')
  }
  if (data.is_active === false) {
    throw new Error('El track de música seleccionado está inactivo')
  }
  return data.public_url
}

async function getJobStatus(jobId: string): Promise<VideoJobStatus | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('video_jobs_v2')
    .select('status')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return data.status as VideoJobStatus
}

const BRAND_CONFIG_SELECT =
  'show_brand_overlays, vehicle_line_1, vehicle_line_2, vehicle_line_3, vehicle_line_4, cta_text, whatsapp_number, logo_url, show_watermark'

async function applyDriveSubtitleNormalization(
  jobId: string,
  blocks: SubtitleBlock[]
): Promise<SubtitleBlock[]> {
  const supabase = getServiceClient()
  const badge = await fetchDriveBadgeForJob(supabase, jobId)
  return normalizeDriveSubtitleBlocks(blocks, badge, jobId)
}

function applyComentaWhenNoGuion(
  subtitleBlocks: SubtitleBlock[],
  sequence: SequenceItem[],
  allSegments: Segment[],
  hasGuionEscenas: boolean,
  brandConfig: Awaited<ReturnType<typeof loadBrandConfigForJob>>,
  jobId: string
): {
  subtitleBlocks: SubtitleBlock[]
  comentaMentionTimeSec?: number
  comentaOverlayText?: string
} {
  if (hasGuionEscenas || !brandConfig) {
    return { subtitleBlocks }
  }

  const result = applyComentaFromAssembly(subtitleBlocks, sequence, allSegments, {
    modelLine: brandConfig.vehicle_line_2,
    yearLine: brandConfig.vehicle_line_4,
    jobId,
  })

  return {
    subtitleBlocks: result.subtitleBlocks,
    ...(result.comentaTimeSec != null ? { comentaMentionTimeSec: result.comentaTimeSec } : {}),
    ...(result.comentaOverlayText ? { comentaOverlayText: result.comentaOverlayText } : {}),
  }
}

async function applyShowcaseCaptionHighlights(
  jobId: string,
  subtitleBlocks: SubtitleBlock[],
  sequence: SequenceItem[],
  brandConfig: BrandConfig | null,
  brandMentionTimeSec?: number
): Promise<SubtitleBlock[]> {
  return applyCaptionHighlights({
    jobId,
    blocks: subtitleBlocks,
    sequence,
    brandMentionTimeSec,
    vehicleContext: {
      brand: brandConfig?.vehicle_line_1 ?? null,
      model: brandConfig?.vehicle_line_2 ?? null,
      year: brandConfig?.vehicle_line_4 ?? null,
    },
    useGemini: true,
  })
}

/** Sin guión: quita subtítulo amarillo duplicado de la 1.ª mención oral si ya hay overlay de título. */
function applyBrandSubtitleDedupWhenNoGuion(
  subtitleBlocks: SubtitleBlock[],
  brandConfig: Awaited<ReturnType<typeof loadBrandConfigForJob>>,
  hasGuionEscenas: boolean,
  jobId: string
): SubtitleBlock[] {
  if (hasGuionEscenas || !brandConfig?.show_brand_overlays) return subtitleBlocks
  const brand = brandConfig.vehicle_line_1?.trim()
  const modelLine = brandConfig.vehicle_line_2?.trim()
  if (!brand || !modelLine) return subtitleBlocks
  return suppressDuplicateBrandMentionSubtitles(subtitleBlocks, { jobId, brand, modelLine })
}

async function loadBrandConfigForJob(jobId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('video_jobs_v2')
    .select(BRAND_CONFIG_SELECT)
    .eq('id', jobId)
    .single()
  if (error) {
    console.error(`[BrandConfig][${jobId}] Error leyendo DB: ${error.message}`)
    return null
  }
  if (!data) {
    console.warn(`[BrandConfig][${jobId}] Sin datos de brandConfig en DB`)
    return null
  }
  console.log(`[BrandConfig][${jobId}] DB row:`, JSON.stringify(data))
  const config = brandConfigFromJobRow(data as BrandConfigJobRow)
  console.log(`[BrandConfig][${jobId}] brandConfigFromJobRow resultado:`, JSON.stringify(config))
  return config
}

async function monitorShotstackRenderFallback(jobId: string, renderId: string) {
  const MAX_WAIT_MS = 20 * 60 * 1000
  const POLL_MS = 15_000
  const started = Date.now()

  console.log(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Fallback monitor para render ${renderId}`)

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS))

    const current = await getJobStatus(jobId)
    if (current === 'completed' || current === 'failed') {
      console.log(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Job ya cerrado (status=${current}).`)
      return
    }

    try {
      const render = await getShotstackRenderStatus(renderId)
      console.log(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] status=${render.status}`)

      if (render.status === 'done') {
        await updateJob(jobId, {
          status: 'completed',
          final_video_url: render.url ?? undefined,
          progress_percentage: 100,
          current_step: 'Video listo (confirmado por polling Shotstack)',
        })
        return
      }

      if (render.status === 'failed') {
        await updateJob(jobId, {
          status: 'failed',
          error_message: render.error ?? 'Shotstack reportó fallo (polling fallback).',
          current_step: 'Error en renderizado',
        })
        return
      }
    } catch (err) {
      console.warn(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Error consultando render: ${err}`)
    }
  }

  await updateJob(jobId, {
    status: 'failed',
    error_message: 'Timeout esperando confirmación final de Shotstack (20 minutos).',
    current_step: 'Timeout de renderizado',
  })
}

async function monitorCreatomateRenderFallback(jobId: string, renderId: string) {
  const MAX_WAIT_MS = 20 * 60 * 1000
  const POLL_MS = 15_000
  const started = Date.now()

  console.log(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Iniciando fallback monitor para render ${renderId}`)

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS))

    const current = await getJobStatus(jobId)
    if (current === 'completed' || current === 'failed') {
      console.log(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Job ya cerrado (status=${current}).`)
      return
    }

    try {
      const render = await getCreatomateRenderStatus(renderId)
      console.log(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] status=${render.status}`)

      if (render.status === 'succeeded') {
        await updateJob(jobId, {
          status: 'completed',
          final_video_url: render.url ?? undefined,
          final_video_duration: render.duration ?? undefined,
          progress_percentage: 100,
          current_step: 'Video listo (confirmado por polling)',
        })
        return
      }

      if (render.status === 'failed') {
        await updateJob(jobId, {
          status: 'failed',
          error_message: render.error_message ?? 'Creatomate reportó fallo (polling fallback).',
          current_step: 'Error en renderizado',
        })
        return
      }
    } catch (err) {
      console.warn(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Error consultando render: ${err}`)
    }
  }

  await updateJob(jobId, {
    status: 'failed',
    error_message: 'Timeout esperando confirmación final de Creatomate (20 minutos).',
    current_step: 'Timeout de renderizado',
  })
}

// ──────────────────────────────────────────────
// FLUJO A — Un solo video largo (desde Storage)
// ──────────────────────────────────────────────

async function runSingleVideoPipelineFromStorage(
  jobId: string,
  storagePath: string,
  signedUrl: string,
  musicTrackUrl: string,
  musicTrimStartSecOverride?: number
) {
  let googleFileRef: GoogleFileRef | null = null

  try {
    // A1 — EN PARALELO: Transcripción + Preparación visual para Gemini
    console.log(`[VideoV2Pipeline][${jobId}][A1] Iniciando transcripción + preparación visual en paralelo`)
    await updateJob(jobId, {
      status: 'transcribing',
      current_step: 'Transcribiendo audio y preparando análisis visual en paralelo...',
      progress_percentage: 20,
    })

    const [transcriptionResult, fileRefResult] = await Promise.allSettled([
      transcribeVideoV2(signedUrl, jobId),
      prepareVideoForGemini(signedUrl, jobId, 'single'),
    ])

    // Transcripción es obligatoria
    if (transcriptionResult.status === 'rejected') {
      throw new Error(`Error en transcripción: ${transcriptionResult.reason}`)
    }
    const { transcriptId, srtContent, rawWords } = transcriptionResult.value

    // Preparación visual es opcional (fallback a solo-texto)
    let useVisualAnalysis = false
    if (fileRefResult.status === 'fulfilled') {
      googleFileRef = fileRefResult.value
      useVisualAnalysis = true
      console.log(`[VideoV2Pipeline][${jobId}][A1] Video listo en Google File API (visual analysis ON)`)
    } else {
      console.warn(
        `[VideoV2Pipeline][${jobId}][GoogleFileAPI] Error al preparar video para Gemini, usando análisis solo de texto como fallback: ${fileRefResult.reason}`
      )
    }

    await updateJob(jobId, {
      assemblyai_transcript_id: transcriptId,
      srt_content: srtContent,
      progress_percentage: 45,
    })

    // A2 — Segmentación
    console.log(`[VideoV2Pipeline][${jobId}][A2] Construyendo mapa de segmentos`)
    await updateJob(jobId, {
      current_step: 'Detectando segmentos de habla y eliminando silencios...',
      progress_percentage: 50,
    })

    const capMs =
      rawWords.length > 0 ? rawWords[rawWords.length - 1]!.end + 3000 : null
    const segments = refineSpokenSegmentsForOneClip(0, rawWords, capMs)
    await updateJob(jobId, { segment_map: segments })
    console.log(`[VideoV2Pipeline][${jobId}][A2] ${segments.length} segmentos detectados`)

    // Detectar guión ANTES de Gemini para que lo use como guía de orden
    {
      const supabaseScript = getServiceClient()
      const { data: metaRow } = await supabaseScript
        .from('video_jobs_v2')
        .select('selected_clips, script_text')
        .eq('id', jobId)
        .single()
      const vId = vehicleIdFromPipelineMeta(metaRow?.selected_clips)
      // Solo buscamos guión si el usuario no subió un PDF (script_text vacío)
      if (!metaRow?.script_text?.trim()) {
        await resolveAndLinkVideoScriptForJob(supabaseScript, jobId, segments, vId)
      }
    }

    if (segments.length === 0) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: 'No se detectó habla en el video. Verifica que el audio sea audible.',
      })
      return
    }

    // A3 — Análisis con Gemini (visual + texto, o solo texto como fallback)
    console.log(`[VideoV2Pipeline][${jobId}][A3] Analizando con Gemini (${useVisualAnalysis ? 'visual+texto' : 'solo texto'})`)
    await updateJob(jobId, {
      status: 'analyzing',
      current_step: useVisualAnalysis
        ? 'Gemini está analizando el video y seleccionando los mejores momentos visualmente...'
        : 'Gemini IA seleccionando los mejores momentos...',
      progress_percentage: 55,
    })

    const formattedMap = formatSegmentMapForPrompt(segments)
    const googleRefs = googleFileRef ? [googleFileRef] : []
    const ctx = await fetchJobGeminiContext(jobId)
    const scriptGuidanceText = ctx.scriptText ?? undefined
    const scriptDialogues = ctx.scriptText ? extractQuotedDialoguesFromScript(ctx.scriptText) : []
    const assemblyDump = formatAssemblyTranscriptDumpForPrompt(segments)
    const geminiOpts: AnalyzeSegmentsOptions = {}
    if (scriptGuidanceText) geminiOpts.scriptGuidanceText = scriptGuidanceText
    if (scriptDialogues.length > 0) geminiOpts.scriptDialogueLines = scriptDialogues
    geminiOpts.assemblyTranscriptDump = assemblyDump
    if (ctx.canonicalVehicle) geminiOpts.canonicalVehicle = ctx.canonicalVehicle

    const escenasSingle = await loadGuionEscenasForPipelineJob(jobId, segments)
    let analysis =
      tryAnalysisFromGuionDialogues(jobId, segments, escenasSingle, {
        excludedClipIndices: [],
        clipKinds: [],
        manualClipOrder: null,
        manualIntro: null,
      }) ?? null

    if (!analysis) {
      console.log(`[VideoV2Pipeline][${jobId}][A3] Fallback: Gemini (${useVisualAnalysis ? 'visual+texto' : 'solo texto'})`)
      analysis = await analyzeSegments(
        formattedMap,
        segments,
        jobId,
        googleRefs,
        useVisualAnalysis,
        [],
        Object.keys(geminiOpts).length > 0 ? geminiOpts : undefined
      )
    } else {
      console.log(`[VideoV2Pipeline][${jobId}][A3] Secuencia por guión (sin llamada Gemini para orden)`)
    }
    await updateJob(jobId, { gemini_analysis: analysis, progress_percentage: 70 })

    // A3b — Limpiar archivo de Google inmediatamente después del análisis
    if (googleFileRef) {
      try {
        await cleanupGoogleFile(googleFileRef, jobId)
      } catch (cleanupErr) {
        console.warn(`[VideoV2Pipeline][${jobId}] Error limpiando Google File (non-fatal): ${cleanupErr}`)
      }
      googleFileRef = null
    }

    // A4 — Construir subtítulos
    console.log(`[VideoV2Pipeline][${jobId}][A4] Construyendo subtítulos`)
    let subtitleBlocks = buildSubtitleBlocks(analysis.sequence, segments)
    subtitleBlocks = await finalizeSubtitleBlocksForJob(
      jobId,
      subtitleBlocks,
      segments,
      analysis.sequence
    )
    const adjustedSrt = buildAdjustedSRT(analysis.sequence, segments)
    await updateJob(jobId, { adjusted_srt: adjustedSrt, progress_percentage: 75 })
    console.log(`[VideoV2Pipeline][${jobId}][A4] ${subtitleBlocks.length} bloques de subtítulos generados`)

    // A5 — Renderizado Shotstack
    console.log(`[VideoV2Pipeline][${jobId}][A5] Enviando a Shotstack`)
    await updateJob(jobId, {
      status: 'rendering',
      current_step: 'Shotstack está renderizando el Reel en alta calidad...',
      progress_percentage: 80,
    })

    const freshSignedUrl = await getSignedUrlForPath(storagePath)
    const clipUrls = [freshSignedUrl]

    let brandMentionTimeSec: number | undefined
    {
      const supabaseInv = getServiceClient()
      const { data: metaRow } = await supabaseInv
        .from('video_jobs_v2')
        .select('selected_clips, video_script_id')
        .eq('id', jobId)
        .single()
      if (!metaRow?.video_script_id) {
        const vId = vehicleIdFromPipelineMeta(metaRow?.selected_clips)
        await resolveAndApplyVehicleFromAssemblyForJob(
          supabaseInv,
          jobId,
          segments,
          { vehicleIdHint: vId }
        )
      }
    }

    const brandConfig = await loadBrandConfigForJob(jobId)

    subtitleBlocks = await applyDriveSubtitleNormalization(jobId, subtitleBlocks)

    subtitleBlocks = applyBrandSubtitleDedupWhenNoGuion(
      subtitleBlocks,
      brandConfig,
      escenasSingle.length > 0,
      jobId
    )

    let comentaMentionTimeSecA: number | undefined
    let comentaOverlayTextA: string | undefined
    {
      const comenta = applyComentaWhenNoGuion(
        subtitleBlocks,
        analysis.sequence,
        segments,
        escenasSingle.length > 0,
        brandConfig,
        jobId
      )
      subtitleBlocks = comenta.subtitleBlocks
      comentaMentionTimeSecA = comenta.comentaMentionTimeSec
      comentaOverlayTextA = comenta.comentaOverlayText
    }

    subtitleBlocks = await applyShowcaseCaptionHighlights(
      jobId,
      subtitleBlocks,
      analysis.sequence,
      brandConfig,
      brandMentionTimeSec
    )

    const renderId = await renderSegmentsV2(jobId, analysis.sequence, clipUrls, subtitleBlocks, musicTrackUrl, undefined, {
      musicTrimStartSecOverride,
      brandConfig,
      brandMentionTimeSec,
      comentaMentionTimeSec: comentaMentionTimeSecA,
      comentaOverlayText: comentaOverlayTextA,
    })
    await updateJob(jobId, {
      creatomate_render_id: renderId,
      progress_percentage: 85,
      current_step: `Render enviado a Shotstack (ID: ${renderId}). Esperando resultado...`,
    })

    setImmediate(() => {
      monitorShotstackRenderFallback(jobId, renderId).catch((e) =>
        console.error(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Error fatal: ${e}`)
      )
    })

    console.log(`[VideoV2Pipeline][${jobId}] Pipeline A completado. Esperando Shotstack.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[VideoV2Pipeline][${jobId}] ERROR (single): ${msg}`)
    await updateJob(jobId, { status: 'failed', error_message: msg })
  } finally {
    // Garantizar limpieza si el pipeline falló antes de llegar al cleanup normal
    if (googleFileRef) {
      cleanupGoogleFile(googleFileRef, jobId).catch(() => {})
    }
  }
}

// ──────────────────────────────────────────────
// FLUJO B — Múltiples clips (desde Storage)
// ──────────────────────────────────────────────

interface ClipTranscriptionRow {
  transcriptId: string
  srtContent: string
  rawWords: RawWord[]
  visualFileDurationSec?: number
}

interface AutoTranscribeResult {
  row: ClipTranscriptionRow
  inferredKind: VideoClipKind
}

function sanitizeSequenceForManualVoiceOver(
  sequence: SequenceItem[],
  voiceOverBaseClipIndex: number,
  voiceOverOverlayClipIndices?: number[]
): SequenceItem[] {
  const excluded = new Set<number>([
    voiceOverBaseClipIndex,
    ...(voiceOverOverlayClipIndices ?? []),
  ])
  const filtered = sequence.filter((item) => !excluded.has(item.clip_index))
  return filtered.map((item, idx) => ({ ...item, order: idx + 1 }))
}

/** VO desde MP3: se excluyen de la línea narrativa solo los clips marcados como planos encima. */
function sanitizeSequenceForMp3VoiceOver(
  sequence: SequenceItem[],
  voiceOverOverlayClipIndices?: number[]
): SequenceItem[] {
  const excluded = new Set<number>([...(voiceOverOverlayClipIndices ?? [])])
  const filtered = sequence.filter((item) => !excluded.has(item.clip_index))
  return filtered.map((item, idx) => ({ ...item, order: idx + 1 }))
}

async function resolveVoiceOverMp3DurationSec(
  clientSec: number | undefined,
  signedAudioUrl: string | undefined,
  jobId: string
): Promise<number> {
  if (typeof clientSec === 'number' && Number.isFinite(clientSec) && clientSec > 0.2) {
    return Number(clientSec.toFixed(3))
  }
  if (signedAudioUrl) {
    const probed = await tryProbeVideoDurationSecondsFromUrl(signedAudioUrl, `${jobId}_vo_mp3`)
    if (probed != null && probed > 0.2) return Number(probed.toFixed(3))
  }
  throw new Error(
    'No se pudo determinar la duración del audio de voz en off. Envía voiceOverMp3DurationSec desde el cliente o instala ffprobe en el servidor.'
  )
}

function deriveVoiceOverSpeechWindow(
  rawWords: RawWord[],
  fallbackDurationSec: number
): { trimStartSec: number; trimmedDurationSec: number; shiftedWords: RawWord[] } {
  if (rawWords.length === 0) {
    return { trimStartSec: 0, trimmedDurationSec: fallbackDurationSec, shiftedWords: [] }
  }
  const firstStartMs = Math.min(...rawWords.map((w) => w.start))
  const lastEndMs = Math.max(...rawWords.map((w) => w.end))
  const maxMs = Math.max(0, Math.round(fallbackDurationSec * 1000))
  const startMs = Math.max(0, Math.min(firstStartMs, Math.max(0, maxMs - 100)))
  const endMs = Math.max(startMs + 100, Math.min(lastEndMs, maxMs > 0 ? maxMs : lastEndMs))
  const trimStartSec = Number((startMs / 1000).toFixed(3))
  const trimmedDurationSec = Number(((endMs - startMs) / 1000).toFixed(3))
  const shiftedWords = rawWords
    .map((w) => ({ ...w, start: w.start - startMs, end: w.end - startMs }))
    .filter((w) => w.end > 0)
  return { trimStartSec, trimmedDurationSec, shiftedWords }
}

async function refreshVoiceOverIntroAudioUrl(
  intro: VoiceOverIntroRenderInput | null
): Promise<VoiceOverIntroRenderInput | null> {
  if (intro == null) return null
  if (!intro.voiceOverAudioPath) return intro
  const fresh = await resolveVoiceOverAudioUrl(intro.voiceOverAudioPath)
  return { ...intro, externalVoiceAudioUrl: fresh }
}

/**
 * Transcribe con AssemblyAI y clasifica el clip: sin palabras o error de transcripción ⇒ B-roll automático.
 * Si `forcedKind` viene definido (API), se respeta salvo spoken vacío, que se rebaja a B-roll.
 */
async function transcribeClipWithAutoKind(
  signedUrl: string,
  jobId: string,
  clipIndex: number,
  clientDurationSec: number | null | undefined,
  forcedKind?: VideoClipKind
): Promise<AutoTranscribeResult> {
  const tag = `${jobId}_clip${clipIndex}`

  async function resolveVisualDuration(): Promise<number> {
    if (typeof clientDurationSec === 'number' && Number.isFinite(clientDurationSec) && clientDurationSec > 0.05) {
      return Number(clientDurationSec.toFixed(3))
    }
    const probed = await tryProbeVideoDurationSecondsFromUrl(signedUrl, tag)
    if (probed != null && probed > 0.05) return probed
    throw new Error(
      `Clip ${clipIndex}: no se pudo obtener la duración del archivo. ` +
        'Desde la app se envían duraciones leídas en el navegador; revisa el formato del video.'
    )
  }

  const emptyVisualRow = (dur: number): ClipTranscriptionRow => ({
    transcriptId: '',
    srtContent: '',
    rawWords: [],
    visualFileDurationSec: dur,
  })

  if (forcedKind === 'visual_only') {
    const d = await resolveVisualDuration()
    console.log(`[VideoV2Pipeline][${tag}] Clip marcado como B-roll (${d}s)`)
    return { row: emptyVisualRow(d), inferredKind: 'visual_only' }
  }

  if (forcedKind === 'spoken') {
    try {
      const r = await transcribeVideoV2(signedUrl, tag)
      if (r.rawWords && r.rawWords.length > 0) {
        return { row: r, inferredKind: 'spoken' }
      }
      console.warn(
        `[VideoV2Pipeline][${tag}] Marcado como con habla pero sin palabras detectadas; se clasifica como B-roll.`
      )
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      console.warn(`[VideoV2Pipeline][${tag}] Transcripción falló (${m.slice(0, 180)}); se clasifica como B-roll.`)
    }
    const d = await resolveVisualDuration()
    return { row: emptyVisualRow(d), inferredKind: 'visual_only' }
  }

  // Automático: AssemblyAI; vacío o error ⇒ B-roll (planos / sin lenguaje útil)
  try {
    const r = await transcribeVideoV2(signedUrl, tag)
    if (!r.rawWords || r.rawWords.length === 0) {
      const d = await resolveVisualDuration()
      console.log(`[VideoV2Pipeline][${tag}] Sin habla transcrita → B-roll automático (${d}s)`)
      return { row: emptyVisualRow(d), inferredKind: 'visual_only' }
    }
    return { row: r, inferredKind: 'spoken' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      `[VideoV2Pipeline][${tag}] AssemblyAI no transcribió (${msg.slice(0, 200)}) → B-roll automático`
    )
    const d = await resolveVisualDuration()
    return { row: emptyVisualRow(d), inferredKind: 'visual_only' }
  }
}

async function resolveVoiceOverTrackDurationSec(
  voIdx: number,
  clipDurationsSec: (number | null)[] | undefined,
  allSegments: Segment[],
  signedUrl: string | undefined,
  jobId: string
): Promise<number> {
  const fromClient = clipDurationsSec?.[voIdx]
  if (typeof fromClient === 'number' && Number.isFinite(fromClient) && fromClient > 0.05) {
    return Number(fromClient.toFixed(3))
  }
  const ends = allSegments.filter((s) => s.clip_index === voIdx).map((s) => s.end_s)
  const maxSeg = ends.length > 0 ? Math.max(...ends) : 0
  if (maxSeg > 0.05) {
    return Number(maxSeg.toFixed(3))
  }
  if (signedUrl) {
    const probed = await tryProbeVideoDurationSecondsFromUrl(signedUrl, `${jobId}_vo_dur`)
    if (probed != null && probed > 0.05) return Number(probed.toFixed(3))
  }
  throw new Error(
    `No se pudo determinar la duración del clip de voz en off (índice ${voIdx}). ` +
      'Asegúrate de que el navegador envíe clipDurations o que el video sea legible.'
  )
}

async function runMultipleClipsPipelineFromStorage(
  jobId: string,
  files: PipelineFile[],
  musicTrackUrl: string,
  clipKindsInput: VideoClipKind[] | undefined,
  clipDurationsSecInput: (number | null)[] | undefined,
  voiceOverBaseClipIndexInput: number | undefined,
  voiceOverOverlayClipIndicesInput: number[] | undefined,
  voiceOverAudioPathInput: string | undefined,
  voiceOverMp3DurationSecInput: number | undefined,
  musicTrimStartSecOverride?: number
) {
  let googleFileRefs: GoogleFileRef[] = []

  try {
    const paths = files.map((f) => f.path!)
    const signedUrls = files.map((f) => f.signedUrl!)
    const explicitKinds =
      clipKindsInput && clipKindsInput.length === files.length ? clipKindsInput : undefined

    const voiceOverBaseClipIndex =
      typeof voiceOverBaseClipIndexInput === 'number' &&
      Number.isInteger(voiceOverBaseClipIndexInput) &&
      voiceOverBaseClipIndexInput >= 0 &&
      voiceOverBaseClipIndexInput < files.length
        ? voiceOverBaseClipIndexInput
        : undefined

    const voiceOverAudioPath =
      typeof voiceOverAudioPathInput === 'string' && voiceOverAudioPathInput.trim().length > 0
        ? voiceOverAudioPathInput.trim()
        : undefined

    if (voiceOverBaseClipIndex != null && voiceOverAudioPath != null) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: 'Configuración inválida: no mezcles clip de VO con archivo de audio VO.',
      })
      return
    }

    if (explicitKinds?.every((k) => k === 'visual_only')) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: 'Se requiere al menos un clip con habla (API: no marques todos los índices como visual_only).',
      })
      return
    }

    // B1 — EN PARALELO: Transcripción de todos los clips + Preparación visual
    console.log(`[VideoV2Pipeline][${jobId}][B1] Iniciando transcripción + preparación visual de ${files.length} clips en paralelo`)
    await updateJob(jobId, {
      status: 'transcribing',
      current_step: `Transcribiendo y clasificando clips (B-roll automático si no hay habla)… ${files.length} archivos`,
      progress_percentage: 20,
    })

    const [transcriptionResults, fileRefsResult] = await Promise.allSettled([
      Promise.all(
        signedUrls.map((url, i) =>
          transcribeClipWithAutoKind(url, jobId, i, clipDurationsSecInput?.[i] ?? null, explicitKinds?.[i])
        )
      ),
      prepareMultipleVideosForGemini(signedUrls, jobId),
    ])

    if (transcriptionResults.status === 'rejected') {
      throw new Error(`Error en transcripción o lectura de clips: ${transcriptionResults.reason}`)
    }
    const autoResults = transcriptionResults.value
    const transcriptions = autoResults.map((a) => a.row)
    const kinds = autoResults.map((a) => a.inferredKind)
    console.log(
      `[VideoV2Pipeline][${jobId}][B1] Clasificación automática: ${kinds.map((k, i) => `${i}:${k}`).join(', ')}`
    )

    if (kinds.every((k) => k === 'visual_only')) {
      await updateJob(jobId, {
        status: 'failed',
        error_message:
          'Ningún clip tiene habla detectable. Sube al menos un clip con audio hablado claro.',
      })
      return
    }

    // Preparación visual es opcional
    let useVisualAnalysis = false
    if (fileRefsResult.status === 'fulfilled') {
      googleFileRefs = fileRefsResult.value
      useVisualAnalysis = true
      console.log(`[VideoV2Pipeline][${jobId}][B1] ${googleFileRefs.length} videos listos en Google File API`)
    } else {
      console.warn(
        `[VideoV2Pipeline][${jobId}][GoogleFileAPI] Error al preparar videos para Gemini, usando análisis solo de texto como fallback: ${fileRefsResult.reason}`
      )
    }

    const combinedSrt = transcriptions.map((r) => r.srtContent).filter(Boolean).join('\n\n')
    let firstAssemblyId: string | undefined
    for (let i = 0; i < kinds.length; i++) {
      if (kinds[i] === 'spoken' && transcriptions[i].transcriptId) {
        firstAssemblyId = transcriptions[i].transcriptId
        break
      }
    }

    await updateJob(jobId, {
      assemblyai_transcript_id: firstAssemblyId,
      srt_content: combinedSrt.length > 0 ? combinedSrt : undefined,
      progress_percentage: 45,
    })

    // B2 — Segmentación de todos los clips
    console.log(`[VideoV2Pipeline][${jobId}][B2] Construyendo mapa de segmentos combinado`)
    await updateJob(jobId, {
      current_step: 'Analizando segmentos de habla de todos los clips...',
      progress_percentage: 50,
    })

    const allSegments: Segment[] = []
    for (let i = 0; i < transcriptions.length; i++) {
      if (kinds[i] === 'visual_only') {
        const dur = transcriptions[i].visualFileDurationSec
        if (!dur || dur <= 0) {
          throw new Error(`No se pudo obtener duración del clip B-roll índice ${i}`)
        }
        allSegments.push(buildVisualOnlyPlaceholderSegment(i, dur))
      } else {
        const raw = transcriptions[i].rawWords
        const capMs =
          typeof clipDurationsSecInput?.[i] === 'number' && Number.isFinite(clipDurationsSecInput[i]!)
            ? Math.round(clipDurationsSecInput[i]! * 1000)
            : raw.length > 0
              ? raw[raw.length - 1]!.end + 3000
              : null
        allSegments.push(...refineSpokenSegmentsForOneClip(i, raw, capMs))
      }
    }

    await updateJob(jobId, { segment_map: allSegments })
    console.log(`[VideoV2Pipeline][${jobId}][B2] ${allSegments.length} segmentos totales de ${files.length} clips`)

    // Detectar guión ANTES de Gemini para que lo use como guía de orden
    {
      const supabaseScript = getServiceClient()
      const { data: metaRow } = await supabaseScript
        .from('video_jobs_v2')
        .select('selected_clips, script_text')
        .eq('id', jobId)
        .single()
      const vId = vehicleIdFromPipelineMeta(metaRow?.selected_clips)
      // Solo buscamos guión si el usuario no subió un PDF (script_text vacío)
      if (!metaRow?.script_text?.trim()) {
        await resolveAndLinkVideoScriptForJob(supabaseScript, jobId, allSegments, vId)
      }
    }

    const spokenSegments = allSegments.filter((s) => s.source_kind !== 'visual_only')
    if (spokenSegments.length === 0) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: 'No se detectó habla en ninguno de los clips marcados como con habla.',
      })
      return
    }

    if (voiceOverBaseClipIndex != null) {
      if (kinds[voiceOverBaseClipIndex] !== 'spoken') {
        await updateJob(jobId, {
          status: 'failed',
          error_message:
            `El clip índice ${voiceOverBaseClipIndex} no tiene habla detectable (AssemblyAI). ` +
              'Elige como voz en off un clip con diálogo transcrito, o desactiva la opción manual.',
        })
        return
      }
      const spokenOutsideVo = allSegments.filter(
        (s) => s.source_kind !== 'visual_only' && s.clip_index !== voiceOverBaseClipIndex
      )
      if (spokenOutsideVo.length === 0) {
        await updateJob(jobId, {
          status: 'failed',
          error_message:
            'Con voz en off manual hace falta al menos otro clip con habla (además del clip base) para el resto del Reel.',
        })
        return
      }
    }

    if (voiceOverAudioPath != null) {
      const overlaySet = new Set(voiceOverOverlayClipIndicesInput ?? [])
      const spokenOutsideOverlays = allSegments.filter(
        (s) => s.source_kind !== 'visual_only' && !overlaySet.has(s.clip_index)
      )
      if (spokenOutsideOverlays.length === 0) {
        await updateJob(jobId, {
          status: 'failed',
          error_message:
            'Con voz en off desde archivo MP3 hace falta al menos un clip con habla que no esté solo como plano encima del VO.',
        })
        return
      }
    }

    // B3 — Análisis con Gemini (visual + texto, o solo texto como fallback)
    console.log(`[VideoV2Pipeline][${jobId}][B3] Analizando con Gemini (${useVisualAnalysis ? 'visual+texto' : 'solo texto'})`)
    await updateJob(jobId, {
      status: 'analyzing',
      current_step: useVisualAnalysis
        ? 'Gemini está analizando los videos y seleccionando los mejores momentos visualmente...'
        : 'Gemini IA seleccionando y ordenando los mejores momentos...',
      progress_percentage: 55,
    })

    // Clips excluidos del montaje narrativo: clip VO (si aplica) + overlays; con MP3 solo overlays.
    const excludeFromNarrative = new Set<number>([
      ...(voiceOverBaseClipIndex != null ? [voiceOverBaseClipIndex] : []),
      ...(voiceOverOverlayClipIndicesInput ?? []),
    ])
    const segmentsForGeminiPrompt = allSegments.filter(
      (s) => !excludeFromNarrative.has(s.clip_index) && s.source_kind !== 'visual_only'
    )
    const formattedMap = formatSegmentMapForPrompt(segmentsForGeminiPrompt)
    const ctx = await fetchJobGeminiContext(jobId)
    const scriptGuidanceText = ctx.scriptText ?? undefined
    const scriptDialogues = ctx.scriptText ? extractQuotedDialoguesFromScript(ctx.scriptText) : []
    const assemblyDump = formatAssemblyTranscriptDumpForPrompt(allSegments)
    const normIntro = normalizeManualIntroClipIndices(
      ctx.manualIntroClipIndicesRaw,
      files.length,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndicesInput ?? []
    )
    const normClipOrder = normalizeManualClipOrderIndices(
      ctx.manualClipOrderIndicesRaw,
      files.length,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndicesInput ?? []
    )
    if (
      ctx.manualIntroClipIndicesRaw &&
      ctx.manualIntroClipIndicesRaw.length > 0 &&
      (!normIntro || normIntro.length === 0)
    ) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][B3] manualIntroClipIndices en job (${JSON.stringify(ctx.manualIntroClipIndicesRaw)}) ` +
          'no produjo ningún índice válido tras normalizar (VO/overlays/rango). Intro fija no se aplicará.'
      )
    }
    if (
      ctx.manualClipOrderIndicesRaw &&
      ctx.manualClipOrderIndicesRaw.length > 0 &&
      (!normClipOrder || normClipOrder.length === 0)
    ) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][B3] manualClipOrderIndices en job (${JSON.stringify(ctx.manualClipOrderIndicesRaw)}) ` +
          'no produjo una permutación válida (VO/overlays/rango). Orden manual de clips no se aplicará.'
      )
    }

    const geminiOpts: AnalyzeSegmentsOptions = {}
    if (voiceOverBaseClipIndex != null) {
      geminiOpts.manualVoiceOverBaseClipIndex = voiceOverBaseClipIndex
    }
    if (voiceOverAudioPath != null) {
      geminiOpts.manualVoiceOverFromExternalAudio = true
      geminiOpts.excludeClipIndicesFromSequence = voiceOverOverlayClipIndicesInput ?? []
    }
    if (scriptGuidanceText) geminiOpts.scriptGuidanceText = scriptGuidanceText
    if (scriptDialogues.length > 0) geminiOpts.scriptDialogueLines = scriptDialogues
    geminiOpts.assemblyTranscriptDump = assemblyDump
    if (ctx.canonicalVehicle) geminiOpts.canonicalVehicle = ctx.canonicalVehicle
    if (normClipOrder && normClipOrder.length > 0) {
      geminiOpts.manualClipOrderIndices = normClipOrder
      console.log(`[VideoV2Pipeline][${jobId}][B3] Orden manual de clips activo: ${normClipOrder.join(' → ')}`)
    } else if (normIntro && normIntro.length > 0) {
      geminiOpts.manualIntroClipIndices = normIntro
      console.log(`[VideoV2Pipeline][${jobId}][B3] Intro fija manual activa: clips ${normIntro.join(' → ')}`)
    }

    const escenasMulti = await loadGuionEscenasForPipelineJob(jobId, allSegments)
    const excludeForGuion = [...excludeFromNarrative]

    const forceChecklist =
      ctx.forceAllManualOrderClips === true &&
      normClipOrder != null &&
      normClipOrder.length > 0

    if (ctx.forceAllManualOrderClips === true && !forceChecklist) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][B3] forceAllManualOrderClips en job pero orden manual inválido — se ignora checklist`
      )
    }

    let analysis: Awaited<ReturnType<typeof analyzeSegments>> | null = null

    if (forceChecklist) {
      const checklistOpts: Parameters<typeof buildForcedManualOrderClipAnalysis>[5] = {}
      if (voiceOverBaseClipIndex != null) {
        checklistOpts.excludeClipIndicesFromSequence = [voiceOverBaseClipIndex]
        checklistOpts.disableVisualOverlayNormalization = true
        checklistOpts.manualVoiceOverBaseClipIndex = voiceOverBaseClipIndex
      } else if (voiceOverAudioPath != null) {
        checklistOpts.excludeClipIndicesFromSequence = voiceOverOverlayClipIndicesInput ?? []
        checklistOpts.disableVisualOverlayNormalization = true
        checklistOpts.manualVoiceOverFromExternalAudio = true
      }
      console.log(
        `[VideoV2Pipeline][${jobId}][B3] Checklist: ${normClipOrder!.length} clip(s) obligatorios en orden ` +
          `${normClipOrder!.join(' → ')} (sin recorte ~35s, sin Gemini para montaje)`
      )
      analysis = buildForcedManualOrderClipAnalysis(
        allSegments,
        normClipOrder!,
        excludeForGuion,
        jobId,
        kinds,
        checklistOpts
      )
    } else {
      analysis =
        tryAnalysisFromGuionDialogues(jobId, allSegments, escenasMulti, {
          excludedClipIndices: excludeForGuion,
          clipKinds: kinds,
          manualClipOrder: normClipOrder,
          manualIntro: normIntro,
          voiceOverBaseClipIndex: voiceOverBaseClipIndex ?? null,
          voiceOverFromMp3: voiceOverAudioPath != null,
        }) ?? null

      if (!analysis) {
        console.log(
          `[VideoV2Pipeline][${jobId}][B3] Fallback: Gemini (${useVisualAnalysis ? 'visual+texto' : 'solo texto'})`
        )
        if (escenasMulti.length > 0) {
          logGuionDialogueMatchMatrix(escenasMulti, allSegments, jobId, excludeForGuion)
        }
        analysis = await analyzeSegments(
          formattedMap,
          allSegments,
          jobId,
          googleFileRefs,
          useVisualAnalysis,
          kinds,
          Object.keys(geminiOpts).length > 0 ? geminiOpts : undefined
        )
      } else {
        console.log(`[VideoV2Pipeline][${jobId}][B3] Secuencia por guión (sin llamada Gemini para orden)`)
      }
    }
    if (voiceOverBaseClipIndex != null) {
      const sanitizedSequence = sanitizeSequenceForManualVoiceOver(
        analysis.sequence,
        voiceOverBaseClipIndex,
        voiceOverOverlayClipIndicesInput
      )
      if (sanitizedSequence.length === 0) {
        await updateJob(jobId, {
          status: 'failed',
          error_message:
            'Gemini devolvió solo segmentos del clip de voz en off/overlays. ' +
            'Sube al menos otro clip con diálogo para armar el resto del Reel.',
        })
        return
      }
      analysis = { ...analysis, sequence: sanitizedSequence }
    } else if (voiceOverAudioPath != null) {
      const sanitizedSequence = sanitizeSequenceForMp3VoiceOver(
        analysis.sequence,
        voiceOverOverlayClipIndicesInput
      )
      if (sanitizedSequence.length === 0) {
        await updateJob(jobId, {
          status: 'failed',
          error_message:
            'Gemini devolvió solo segmentos reservados como planos sobre la VO. ' +
            'Deja al menos un clip con diálogo fuera de “clips encima del VO”.',
        })
        return
      }
      analysis = { ...analysis, sequence: sanitizedSequence }
    }

    await updateJob(jobId, { gemini_analysis: analysis, progress_percentage: 70 })

    if ((voiceOverBaseClipIndex != null || voiceOverAudioPath != null) && analysis.sequence.length === 0) {
      await updateJob(jobId, {
        status: 'failed',
        error_message:
          'Gemini no devolvió segmentos narrativos (sin el clip de VO). Revisa los clips o inténtalo de nuevo.',
      })
      return
    }

    // B3b — Limpiar archivos de Google
    if (googleFileRefs.length > 0) {
      try {
        await cleanupMultipleGoogleFiles(googleFileRefs, jobId)
      } catch (cleanupErr) {
        console.warn(`[VideoV2Pipeline][${jobId}] Error limpiando Google Files (non-fatal): ${cleanupErr}`)
      }
      googleFileRefs = []
    }

    // B4 — Construir subtítulos (incluye bloque VO + overlays manuales si vinieron en el job)
    console.log(`[VideoV2Pipeline][${jobId}][B4] Construyendo subtítulos`)
    const clipFilenames = files.map((f) => f.filename || '')
    let { subtitleBlocks, adjustedSrt, voiceOverIntro } = await computeAutomaticSubtitlePayload({
      jobId,
      paths,
      analysis,
      allSegments,
      kinds,
      clipDurationsSecInput,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndices: voiceOverOverlayClipIndicesInput,
      voiceOverAudioPath,
      voiceOverMp3DurationSec: voiceOverMp3DurationSecInput,
      clipFilenames,
      signedClipUrls: signedUrls,
      scriptTextForSubtitles: scriptGuidanceText ?? null,
    })

    let geminiAnalysisPatch: typeof analysis | undefined
    if (voiceOverIntro != null) {
      const ins = Math.max(
        0,
        Math.min(analysis.voice_over_insert_after_count ?? 0, analysis.sequence.length)
      )
      const afterS = analysis.sequence.slice(ins)
      const beforeS = analysis.sequence.slice(0, ins)
      const d0 = sumSequenceItemsDurationSec(beforeS)
      geminiAnalysisPatch = {
        ...analysis,
        total_duration: Number(
          (d0 + voiceOverIntro.voDurationSec + sumSequenceItemsDurationSec(afterS)).toFixed(3)
        ),
      }
    }

    await updateJob(jobId, {
      adjusted_srt: adjustedSrt,
      progress_percentage: 75,
      ...(geminiAnalysisPatch ? { gemini_analysis: geminiAnalysisPatch } : {}),
    })
    console.log(`[VideoV2Pipeline][${jobId}][B4] ${subtitleBlocks.length} bloques de subtítulos generados`)

    // B5 — Renderizado Shotstack
    console.log(`[VideoV2Pipeline][${jobId}][B5] Enviando a Shotstack`)
    await updateJob(jobId, {
      status: 'rendering',
      current_step: 'Shotstack está renderizando el Reel en alta calidad...',
      progress_percentage: 80,
    })

    const freshClipUrls = await Promise.all(
      paths.map((p) => getSignedUrlForPath(p))
    )

    const voIntroForRender = await refreshVoiceOverIntroAudioUrl(voiceOverIntro)

    let brandMentionTimeSec: number | undefined
    let brandMentionLengthSec: number | undefined
    let comentaMentionTimeSec: number | undefined
    let comentaOverlayText: string | undefined

    if (escenasMulti.length === 0) {
      const supabaseInv = getServiceClient()
      const { data: metaRow } = await supabaseInv
        .from('video_jobs_v2')
        .select('selected_clips, video_script_id')
        .eq('id', jobId)
        .single()
      if (!metaRow?.video_script_id) {
        const vId = vehicleIdFromPipelineMeta(metaRow?.selected_clips)
        await resolveAndApplyVehicleFromAssemblyForJob(
          supabaseInv,
          jobId,
          allSegments,
          { vehicleIdHint: vId }
        )
      }
    }

    const brandConfig = await loadBrandConfigForJob(jobId)

    // ── Subtítulos desde dialogo + Assembly (reemplaza texto_pantalla) ─────
    if (escenasMulti.length > 0) {
      const brandKws = [
        brandConfig?.vehicle_line_1?.trim(),
        brandConfig?.vehicle_line_2?.trim().split(/\s+/)[0],
      ].filter((k): k is string => !!k && k.length >= 2)

      const { captionBlocks, brandTimeSec, brandLengthSec, comentaTimeSec, comentaOverlayText: comentaText } =
        buildCaptionBlocksFromDialogoAssembly(
          analysis.sequence,
          allSegments,
          escenasMulti,
          brandKws,
          jobId,
          {
            modelLine: brandConfig?.vehicle_line_2,
            yearLine: brandConfig?.vehicle_line_4,
          }
        )

      if (captionBlocks.length > 0) {
        subtitleBlocks = captionBlocks
        console.log(
          `[VideoV2Pipeline][${jobId}][B4] Subtítulos dialogo+Assembly: ${captionBlocks.length} bloques`
        )
      }
      if (brandTimeSec != null) {
        brandMentionTimeSec = brandTimeSec
        brandMentionLengthSec = brandLengthSec ?? 3.5
      }
      if (comentaTimeSec != null) {
        comentaMentionTimeSec = comentaTimeSec
      }
      if (comentaText?.trim()) {
        comentaOverlayText = comentaText.trim()
      }
    }

    subtitleBlocks = await applyDriveSubtitleNormalization(jobId, subtitleBlocks)

    subtitleBlocks = applyBrandSubtitleDedupWhenNoGuion(
      subtitleBlocks,
      brandConfig,
      escenasMulti.length > 0,
      jobId
    )

    if (escenasMulti.length === 0) {
      const comenta = applyComentaWhenNoGuion(
        subtitleBlocks,
        analysis.sequence,
        allSegments,
        false,
        brandConfig,
        jobId
      )
      subtitleBlocks = comenta.subtitleBlocks
      if (comenta.comentaMentionTimeSec != null) {
        comentaMentionTimeSec = comenta.comentaMentionTimeSec
      }
      if (comenta.comentaOverlayText) {
        comentaOverlayText = comenta.comentaOverlayText
      }
    }

    subtitleBlocks = await applyShowcaseCaptionHighlights(
      jobId,
      subtitleBlocks,
      analysis.sequence,
      brandConfig,
      brandMentionTimeSec
    )

    const renderId = await renderSegmentsV2(
      jobId,
      analysis.sequence,
      freshClipUrls,
      subtitleBlocks,
      musicTrackUrl,
      voIntroForRender,
      { musicTrimStartSecOverride, brandConfig, brandMentionTimeSec, brandMentionLengthSec, comentaMentionTimeSec, comentaOverlayText }
    )
    await updateJob(jobId, {
      creatomate_render_id: renderId,
      progress_percentage: 85,
      current_step: `Render enviado a Shotstack (ID: ${renderId}). Esperando resultado...`,
    })

    setImmediate(() => {
      monitorShotstackRenderFallback(jobId, renderId).catch((e) =>
        console.error(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Error fatal: ${e}`)
      )
    })

    console.log(`[VideoV2Pipeline][${jobId}] Pipeline B completado. Esperando Shotstack.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[VideoV2Pipeline][${jobId}] ERROR (multiple): ${msg}`)
    await updateJob(jobId, { status: 'failed', error_message: msg })
  } finally {
    if (googleFileRefs.length > 0) {
      cleanupMultipleGoogleFiles(googleFileRefs, jobId).catch(() => {})
    }
  }
}

function parseSegmentMapJson(raw: unknown): Segment[] {
  if (!Array.isArray(raw)) {
    throw new Error('segment_map inválido o vacío: no se puede re-renderizar sin el mapa guardado.')
  }
  return raw as Segment[]
}

function coerceGeminiAnalysisFromUnknown(raw: unknown, jobId: string): GeminiSegmentAnalysisResult {
  if (typeof raw !== 'object' || raw === null || !('sequence' in raw)) {
    throw new Error(`[${jobId}] gemini_analysis inválido: se esperaba un objeto con "sequence".`)
  }
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.sequence) || o.sequence.length === 0) {
    throw new Error(`[${jobId}] "sequence" vacía o no es un array.`)
  }
  const seq: SequenceItem[] = o.sequence.map((item, idx) => {
    const it = item as Record<string, unknown>
    if (typeof it.segment_id !== 'string') {
      throw new Error(`Ítem ${idx}: falta segment_id (string).`)
    }
    const base: SequenceItem = {
      segment_id: it.segment_id,
      clip_index: Number(it.clip_index),
      trim_start: Number(it.trim_start),
      trim_end: Number(it.trim_end),
      trim_duration: Number(it.trim_duration),
      order: Number(it.order ?? idx + 1),
      reason: String(it.reason ?? ''),
    }
    if (it.visual_overlay && typeof it.visual_overlay === 'object') {
      const ov = it.visual_overlay as Record<string, unknown>
      base.visual_overlay = {
        clip_index: Number(ov.clip_index),
        trim_start: Number(ov.trim_start),
        trim_end: Number(ov.trim_end),
      }
    }
    return base
  })
  seq.sort((a, b) => a.order - b.order)
  seq.forEach((it, i) => {
    it.order = i + 1
  })
  const sumDur = Number(seq.reduce((s, x) => s + x.trim_duration, 0).toFixed(3))
  return {
    sequence: seq,
    total_duration:
      typeof o.total_duration === 'number' && Number.isFinite(o.total_duration)
        ? Number(o.total_duration.toFixed(3))
        : sumDur,
    overall_strategy: String(o.overall_strategy ?? ''),
    ...(typeof o.voice_over_insert_after_count === 'number'
      ? { voice_over_insert_after_count: o.voice_over_insert_after_count }
      : {}),
  }
}

function assertSequenceMatchesStoredSegments(
  analysis: GeminiSegmentAnalysisResult,
  segments: Segment[],
  jobId: string
): void {
  const lookup = new Map(segments.map((s) => [s.segment_id, s]))
  for (const item of analysis.sequence) {
    if (!lookup.has(item.segment_id)) {
      throw new Error(
        `[${jobId}] segment_id "${item.segment_id}" no existe en el segment_map guardado. ` +
          'Revisa el JSON o vuelve a procesar el job desde cero.'
      )
    }
  }
}

export function parseSubtitleBlocksOverride(raw: unknown): SubtitleBlock[] | null {
  if (raw == null) return null
  if (!Array.isArray(raw)) {
    throw new Error('subtitle_blocks_override debe ser un array JSON o null')
  }
  const out: SubtitleBlock[] = []
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i] as Record<string, unknown>
    const time = Number(o.time)
    const duration = Number(o.duration)
    const text = String(o.text ?? '').trim()
    if (!Number.isFinite(time) || time < 0 || !Number.isFinite(duration) || duration < 0.08 || text.length === 0) {
      throw new Error(
        `Subtítulo ${i + 1}: "time" (s) ≥ 0, "duration" (s) ≥ 0.08 y "text" no vacío son obligatorios`
      )
    }
    out.push({
      time: Number(time.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      text,
    })
  }
  return out.length > 0 ? out : null
}

async function computeAutomaticSubtitlePayload(params: {
  jobId: string
  paths: string[]
  analysis: GeminiSegmentAnalysisResult
  allSegments: Segment[]
  kinds: VideoClipKind[]
  clipDurationsSecInput?: (number | null)[]
  voiceOverBaseClipIndex?: number
  /** Si hay entradas, planos encima de la VO en ese orden (lineal, audio mute en render). */
  voiceOverOverlayClipIndices?: number[]
  /** Audio de VO en Storage (excluyente con voiceOverBaseClipIndex). */
  voiceOverAudioPath?: string
  voiceOverMp3DurationSec?: number
  clipFilenames: string[]
  signedClipUrls: string[]
  /** Guion / PDF extraído: subtítulos del bloque VO MP3 (sin ASR del MP3). */
  scriptTextForSubtitles?: string | null
}): Promise<{
  subtitleBlocks: SubtitleBlock[]
  adjustedSrt: string
  voiceOverIntro: VoiceOverIntroRenderInput | null
}> {
  const {
    jobId,
    paths,
    analysis,
    allSegments,
    kinds,
    clipDurationsSecInput,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices,
    voiceOverAudioPath,
    voiceOverMp3DurationSec,
    clipFilenames,
    signedClipUrls,
    scriptTextForSubtitles,
  } = params
  let analysisForRender = analysis

  let subtitleBlocks = buildSubtitleBlocks(analysisForRender.sequence, allSegments)
  let adjustedSrt = buildAdjustedSRT(analysisForRender.sequence, allSegments)
  let voiceOverIntro: VoiceOverIntroRenderInput | null = null

  const voOverlayNormalized =
    voiceOverBaseClipIndex != null &&
    Array.isArray(voiceOverOverlayClipIndices) &&
    voiceOverOverlayClipIndices.length > 0
      ? normalizeVoiceOverOverlayClipIndices(
          voiceOverOverlayClipIndices,
          paths.length,
          voiceOverBaseClipIndex
        )
      : undefined

  const clipDurationsForRender = Array.from({ length: paths.length }, (_, i) => {
    const c = clipDurationsSecInput?.[i]
    if (typeof c === 'number' && Number.isFinite(c) && c > 0.05) return Number(c.toFixed(3))
    const vis = allSegments.find((s) => s.clip_index === i && s.source_kind === 'visual_only')
    if (vis && vis.duration_s > 0.05) return vis.duration_s
    const ends = allSegments.filter((s) => s.clip_index === i).map((s) => s.end_s)
    const m = ends.length ? Math.max(...ends) : 0
    return m > 0.05 ? Number(m.toFixed(3)) : null
  })

  if (voiceOverBaseClipIndex != null) {
    analysisForRender = {
      ...analysisForRender,
      sequence: sanitizeSequenceForManualVoiceOver(
        analysisForRender.sequence,
        voiceOverBaseClipIndex,
        voOverlayNormalized ?? voiceOverOverlayClipIndices
      ),
    }
    if (analysisForRender.sequence.length === 0) {
      throw new Error(
        'No quedaron segmentos narrativos después de excluir el clip de voz en off y overlays.'
      )
    }

    const voDur = await resolveVoiceOverTrackDurationSec(
      voiceOverBaseClipIndex,
      clipDurationsSecInput,
      allSegments,
      signedClipUrls[voiceOverBaseClipIndex],
      jobId
    )
    const insertAfter = Math.max(
      0,
      Math.min(analysisForRender.voice_over_insert_after_count ?? 0, analysisForRender.sequence.length)
    )
    const beforeSeq = analysisForRender.sequence.slice(0, insertAfter)
    const afterSeq = analysisForRender.sequence.slice(insertAfter)
    const dBefore = sumSequenceItemsDurationSec(beforeSeq)

    const dedicatedBrollForRender = kinds
      .map((k, i) => ({ k, i }))
      .filter(({ k, i }) => k === 'visual_only' && i !== voiceOverBaseClipIndex)
      .map(({ i }) => i)
    const brollOrder =
      voOverlayNormalized && voOverlayNormalized.length > 0
        ? voOverlayNormalized
        : dedicatedBrollForRender.length > 0
          ? dedicatedBrollForRender
          : [...new Set(
              analysisForRender.sequence
                .map((item) => item.clip_index)
                .filter((idx) => idx !== voiceOverBaseClipIndex)
            )]
    const brollOrderSafe =
      brollOrder.length > 0
        ? brollOrder
        : Array.from({ length: paths.length }, (_, i) => i).filter((i) => i !== voiceOverBaseClipIndex)

    const voBrollTiles =
      voOverlayNormalized && voOverlayNormalized.length > 0
        ? planLinearBrollTiling(voDur, brollOrderSafe, clipDurationsForRender)
        : buildSemanticVoiceOverBrollTiles(
            voDur,
            brollOrderSafe,
            clipDurationsForRender,
            analysisForRender.sequence,
            allSegments,
            voiceOverBaseClipIndex,
            clipFilenames
          )
    voiceOverIntro = {
      voClipIndex: voiceOverBaseClipIndex,
      voDurationSec: voDur,
      brollClipIndicesInFileOrder: brollOrderSafe,
      clipFileDurationsSec: clipDurationsForRender,
      insertAfterSegmentCount: insertAfter,
      voBrollTiles,
    }

    const blocksBefore = buildSubtitleBlocks(beforeSeq, allSegments)
    const voBlocks = buildSubtitleBlocksForVoiceOverIntro(
      allSegments,
      voiceOverBaseClipIndex,
      voDur,
      dBefore
    )
    const blocksAfter = offsetSubtitleBlocks(buildSubtitleBlocks(afterSeq, allSegments), dBefore + voDur)
    subtitleBlocks = [...blocksBefore, ...voBlocks, ...blocksAfter]

    const srtBefore = buildAdjustedSRT(beforeSeq, allSegments, 0)
    const srtVo = buildAdjustedSRTForVoiceOverIntro(
      allSegments,
      voiceOverBaseClipIndex,
      voDur,
      dBefore
    )
    const srtAfter = buildAdjustedSRT(afterSeq, allSegments, dBefore + voDur)
    adjustedSrt = [srtBefore, srtVo, srtAfter].filter((s) => s.trim().length > 0).join('\n\n')
    const overlayNote =
      voOverlayNormalized && voOverlayNormalized.length > 0
        ? `overlays manuales [${voOverlayNormalized.join(',')}] lineales`
        : `${brollOrderSafe.length} clips B-roll, ${voBrollTiles.length} ventanas`
    console.log(
      `[VideoV2Pipeline][${jobId}][B4] Modo VO: bloque ${voDur}s tras ${insertAfter} cortes; ${overlayNote}`
    )
  } else if (voiceOverAudioPath != null && voiceOverAudioPath.trim().length > 0) {
    const voPath = voiceOverAudioPath.trim()
    const signedAudio = await resolveVoiceOverAudioUrl(voPath)
    const voFileDur = await resolveVoiceOverMp3DurationSec(voiceOverMp3DurationSec, signedAudio, jobId)
    let voTrimStartSec = 0
    let voDur = voFileDur
    let voMp3Words: RawWord[] = []

    const voOverlayMp3 = normalizeVoiceOverMp3OverlayIndices(
      voiceOverOverlayClipIndices ?? [],
      paths.length
    )

    try {
      const voTx = await transcribeVideoV2(signedAudio, `${jobId}_vo_mp3`)
      if (voTx.rawWords.length > 0) {
        const speechWindow = deriveVoiceOverSpeechWindow(voTx.rawWords, voFileDur)
        voTrimStartSec = speechWindow.trimStartSec
        voDur = speechWindow.trimmedDurationSec
        voMp3Words = speechWindow.shiftedWords
        console.log(
          `[VideoV2Pipeline][${jobId}][B4] VO MP3 trim silencios: start=${voTrimStartSec.toFixed(2)}s, dur=${voDur.toFixed(2)}s (archivo=${voFileDur.toFixed(2)}s).`
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(
        `[VideoV2Pipeline][${jobId}][B4] AssemblyAI no pudo transcribir el MP3 de VO (${msg.slice(0, 200)}); ` +
          'se usa el audio completo sin recorte por silencio en extremos.'
      )
    }

    analysisForRender = {
      ...analysisForRender,
      sequence: sanitizeSequenceForMp3VoiceOver(
        analysisForRender.sequence,
        voOverlayMp3 ?? []
      ),
    }
    if (analysisForRender.sequence.length === 0) {
      throw new Error(
        'No quedaron segmentos narrativos después de excluir los clips reservados como planos sobre la VO (MP3).'
      )
    }

    const insertAfter = Math.max(
      0,
      Math.min(analysisForRender.voice_over_insert_after_count ?? 0, analysisForRender.sequence.length)
    )
    const beforeSeq = analysisForRender.sequence.slice(0, insertAfter)
    const afterSeq = analysisForRender.sequence.slice(insertAfter)
    const dBefore = sumSequenceItemsDurationSec(beforeSeq)

    const dedicatedBrollForRender = kinds
      .map((k, i) => ({ k, i }))
      .filter(({ k }) => k === 'visual_only')
      .map(({ i }) => i)
    const brollOrder =
      voOverlayMp3 && voOverlayMp3.length > 0
        ? voOverlayMp3
        : dedicatedBrollForRender.length > 0
          ? dedicatedBrollForRender
          : [...new Set(analysisForRender.sequence.map((item) => item.clip_index))]
    const brollOrderSafe = brollOrder.length > 0 ? brollOrder : [0]

    const voBrollTiles =
      voOverlayMp3 && voOverlayMp3.length > 0
        ? planLinearBrollTiling(voDur, brollOrderSafe, clipDurationsForRender)
        : buildSemanticVoiceOverBrollTiles(
            voDur,
            brollOrderSafe,
            clipDurationsForRender,
            analysisForRender.sequence,
            allSegments,
            VOICE_OVER_EXTERNAL_CLIP_INDEX,
            clipFilenames
          )

    voiceOverIntro = {
      voClipIndex: VOICE_OVER_EXTERNAL_CLIP_INDEX,
      voDurationSec: voDur,
      brollClipIndicesInFileOrder: brollOrderSafe,
      clipFileDurationsSec: clipDurationsForRender,
      insertAfterSegmentCount: insertAfter,
      voBrollTiles,
      externalVoiceAudioUrl: signedAudio,
      voiceOverAudioPath: voPath,
      externalVoiceTrimStartSec: voTrimStartSec,
    }

    const blocksBefore = buildSubtitleBlocks(beforeSeq, allSegments)
    let voMp3Blocks: SubtitleBlock[] = []
    if (voMp3Words.length > 0) {
      voMp3Blocks = buildSubtitleBlocksFromRawWords(voMp3Words, voDur, dBefore)
    }
    if (voMp3Blocks.length === 0) {
      voMp3Blocks = buildSubtitleBlocksForExternalVoiceOver(
        voDur,
        dBefore,
        scriptTextForSubtitles ?? null
      )
    }
    const blocksAfter = offsetSubtitleBlocks(buildSubtitleBlocks(afterSeq, allSegments), dBefore + voDur)
    subtitleBlocks = [...blocksBefore, ...voMp3Blocks, ...blocksAfter]

    const srtBefore = buildAdjustedSRT(beforeSeq, allSegments, 0)
    const srtVoMp3 = buildAdjustedSrtFromSubtitleBlocks(voMp3Blocks)
    const srtAfter = buildAdjustedSRT(afterSeq, allSegments, dBefore + voDur)
    adjustedSrt = [srtBefore, srtVoMp3, srtAfter].filter((s) => s.trim().length > 0).join('\n\n')
    const overlayNoteMp3 =
      voOverlayMp3 && voOverlayMp3.length > 0
        ? `overlays MP3 [${voOverlayMp3.join(',')}] lineales`
        : `${brollOrderSafe.length} clips B-roll, ${voBrollTiles.length} ventanas`
    console.log(
      `[VideoV2Pipeline][${jobId}][B4] Modo VO MP3: bloque ${voDur}s tras ${insertAfter} cortes; ${overlayNoteMp3}`
    )
  }

  subtitleBlocks = await finalizeSubtitleBlocksForJob(
    jobId,
    subtitleBlocks,
    allSegments,
    analysisForRender.sequence
  )

  return { subtitleBlocks, adjustedSrt, voiceOverIntro }
}

export type VideoJobSegmentTrimBound = {
  segment_id: string
  clip_index: number
  min_start_s: number
  max_end_s: number
}

export async function getVideoJobEditorState(jobId: string): Promise<{
  gemini_analysis: GeminiSegmentAnalysisResult
  subtitle_blocks_auto: SubtitleBlock[]
  subtitle_blocks_effective: SubtitleBlock[]
  subtitle_override_active: boolean
  segment_trim_bounds: VideoJobSegmentTrimBound[]
}> {
  const supabase = getServiceClient()
  const { data: job, error } = await supabase
    .from('video_jobs_v2')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job?.gemini_analysis || !job.segment_map) {
    throw new Error('Job no encontrado o sin análisis / mapa de segmentos')
  }

  const paths = job.raw_video_paths ?? []
  if (paths.length === 0) throw new Error('Job sin raw_video_paths')

  const allSegments = parseSegmentMapJson(job.segment_map)
  const analysis = coerceGeminiAnalysisFromUnknown(job.gemini_analysis, jobId)
  assertSequenceMatchesStoredSegments(analysis, allSegments, jobId)

  let kinds = defaultClipKinds(paths.length)
  let clipDurationsSecInput: (number | null)[] | undefined
  let voiceOverBaseClipIndex: number | undefined
  let voiceOverOverlayClipIndicesFromMeta: number[] | undefined
  let voiceOverAudioPathFromMeta: string | undefined
  let voiceOverMp3DurationSecFromMeta: number | undefined
  let musicTrimStartSecFromMeta: number | undefined
  const sc = job.selected_clips
  if (isPipelineInputMeta(sc)) {
    if (Array.isArray(sc.clipKinds) && sc.clipKinds.length === paths.length) {
      kinds = normalizeClipKindsInput(sc.clipKinds, paths.length)
    }
    if (Array.isArray(sc.clipDurationsSec) && sc.clipDurationsSec.length === paths.length) {
      clipDurationsSecInput = normalizeClipDurationsInput(sc.clipDurationsSec, paths.length)
    }
    if (typeof sc.voiceOverBaseClipIndex === 'number') {
      voiceOverBaseClipIndex = sc.voiceOverBaseClipIndex
    }
    if (typeof sc.voiceOverAudioPath === 'string' && sc.voiceOverAudioPath.trim().length > 0) {
      voiceOverAudioPathFromMeta = sc.voiceOverAudioPath.trim()
    }
    if (
      typeof sc.voiceOverMp3DurationSec === 'number' &&
      Number.isFinite(sc.voiceOverMp3DurationSec) &&
      sc.voiceOverMp3DurationSec > 0.2
    ) {
      voiceOverMp3DurationSecFromMeta = Number(sc.voiceOverMp3DurationSec.toFixed(3))
    }
    musicTrimStartSecFromMeta = normalizeMusicTrimStartSec(sc.musicTrimStartSec)
    if (
      voiceOverAudioPathFromMeta &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const normMp3 = normalizeVoiceOverMp3OverlayIndices(sc.voiceOverOverlayClipIndices, paths.length)
      if (normMp3 && normMp3.length > 0) voiceOverOverlayClipIndicesFromMeta = normMp3
    } else if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm && norm.length > 0) voiceOverOverlayClipIndicesFromMeta = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))
  const signedClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const scriptSt =
    typeof job.script_text === 'string' && job.script_text.trim().length > 0 ? job.script_text : null
  const { subtitleBlocks: autoBlocks } = await computeAutomaticSubtitlePayload({
    jobId,
    paths,
    analysis,
    allSegments,
    kinds,
    clipDurationsSecInput,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices: voiceOverOverlayClipIndicesFromMeta,
    voiceOverAudioPath: voiceOverAudioPathFromMeta,
    voiceOverMp3DurationSec: voiceOverMp3DurationSecFromMeta,
    clipFilenames,
    signedClipUrls,
    scriptTextForSubtitles: scriptSt,
  })

  let override: SubtitleBlock[] | null = null
  try {
    override = parseSubtitleBlocksOverride(job.subtitle_blocks_override)
  } catch (e) {
    console.warn(`[VideoV2Pipeline][${jobId}] subtitle_blocks_override en DB ignorado: ${e}`)
  }

  const segment_trim_bounds: VideoJobSegmentTrimBound[] = allSegments
    .filter((s) => s.source_kind !== 'visual_only')
    .map((s) => ({
      segment_id: s.segment_id,
      clip_index: s.clip_index,
      min_start_s: s.start_s,
      max_end_s: s.end_s,
    }))

  return {
    gemini_analysis: analysis,
    subtitle_blocks_auto: autoBlocks,
    subtitle_blocks_effective: override ?? autoBlocks,
    subtitle_override_active: override != null,
    segment_trim_bounds,
  }
}

/**
 * Nuevo envío a Creatomate usando el `segment_map` ya guardado y un `gemini_analysis`
 * (el del job o uno editado). Útil para corregir cortes/subtítulos sin re-transcribir.
 */
/**
 * Misma composición que se enviaría a Creatomate en un re-render, sin mutar el job ni iniciar render.
 * Sirve para el Preview SDK (`setSource`) y para inspección.
 */
export async function getCreatomateRenderScriptForJob(
  jobId: string,
  geminiAnalysisOverride?: unknown
): Promise<CreatomateFlatRenderScript> {
  const supabase = getServiceClient()
  const { data: job, error } = await supabase
    .from('video_jobs_v2')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new Error('Job no encontrado')
  }
  const paths = job.raw_video_paths ?? []
  if (paths.length === 0) {
    throw new Error('Job sin raw_video_paths')
  }
  if (!job.music_track_url) {
    throw new Error('Job sin música asignada')
  }
  if (!job.segment_map) {
    throw new Error('Job sin segment_map')
  }

  const allSegments = parseSegmentMapJson(job.segment_map)
  const rawAnalysis = geminiAnalysisOverride ?? job.gemini_analysis
  const analysis = coerceGeminiAnalysisFromUnknown(rawAnalysis, jobId)
  assertSequenceMatchesStoredSegments(analysis, allSegments, jobId)

  let kinds = defaultClipKinds(paths.length)
  let clipDurationsSecInput: (number | null)[] | undefined
  let voiceOverBaseClipIndex: number | undefined
  let voiceOverOverlayClipIndicesFromMeta: number[] | undefined
  let voiceOverAudioPathFromMeta: string | undefined
  let voiceOverMp3DurationSecFromMeta: number | undefined
  let musicTrimStartSecFromMeta: number | undefined
  const sc = job.selected_clips
  if (isPipelineInputMeta(sc)) {
    if (Array.isArray(sc.clipKinds) && sc.clipKinds.length === paths.length) {
      kinds = normalizeClipKindsInput(sc.clipKinds, paths.length)
    }
    if (Array.isArray(sc.clipDurationsSec) && sc.clipDurationsSec.length === paths.length) {
      clipDurationsSecInput = normalizeClipDurationsInput(sc.clipDurationsSec, paths.length)
    }
    if (typeof sc.voiceOverBaseClipIndex === 'number') {
      voiceOverBaseClipIndex = sc.voiceOverBaseClipIndex
    }
    if (typeof sc.voiceOverAudioPath === 'string' && sc.voiceOverAudioPath.trim().length > 0) {
      voiceOverAudioPathFromMeta = sc.voiceOverAudioPath.trim()
    }
    if (
      typeof sc.voiceOverMp3DurationSec === 'number' &&
      Number.isFinite(sc.voiceOverMp3DurationSec) &&
      sc.voiceOverMp3DurationSec > 0.2
    ) {
      voiceOverMp3DurationSecFromMeta = Number(sc.voiceOverMp3DurationSec.toFixed(3))
    }
    musicTrimStartSecFromMeta = normalizeMusicTrimStartSec(sc.musicTrimStartSec)
    if (
      voiceOverAudioPathFromMeta &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const normMp3 = normalizeVoiceOverMp3OverlayIndices(sc.voiceOverOverlayClipIndices, paths.length)
      if (normMp3 && normMp3.length > 0) voiceOverOverlayClipIndicesFromMeta = normMp3
    } else if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm && norm.length > 0) voiceOverOverlayClipIndicesFromMeta = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))

  const freshClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const scriptStPreview =
    typeof job.script_text === 'string' && job.script_text.trim().length > 0 ? job.script_text : null
  const { subtitleBlocks: autoSubtitleBlocks, voiceOverIntro } = await computeAutomaticSubtitlePayload({
    jobId,
    paths,
    analysis,
    allSegments,
    kinds,
    clipDurationsSecInput,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices: voiceOverOverlayClipIndicesFromMeta,
    voiceOverAudioPath: voiceOverAudioPathFromMeta,
    voiceOverMp3DurationSec: voiceOverMp3DurationSecFromMeta,
    clipFilenames,
    signedClipUrls: freshClipUrls,
    scriptTextForSubtitles: scriptStPreview,
  })

  let subtitleBlocks = autoSubtitleBlocks
  try {
    const ovr = parseSubtitleBlocksOverride(job.subtitle_blocks_override)
    if (ovr && ovr.length > 0) {
      subtitleBlocks = ovr
    }
  } catch (e) {
    console.warn(
      `[VideoV2Pipeline][${jobId}] subtitle_blocks_override inválido, se usan subtítulos automáticos: ${e}`
    )
  }

  const voIntroFresh = await refreshVoiceOverIntroAudioUrl(voiceOverIntro)

  const timeline = computeReelTimelineMeta(analysis.sequence, voIntroFresh)
  const musicTrimStartSec =
    musicTrimStartSecFromMeta ??
    (await pickSmartMusicTrimStartSec({
      jobId,
      musicUrl: job.music_track_url,
      reelDurationSec: timeline.totalDurationSec,
      cutStartTimesSec: timeline.cutStartTimesSec,
    }))

  return buildCreatomateRenderScript(
    jobId,
    analysis.sequence,
    freshClipUrls,
    subtitleBlocks,
    job.music_track_url,
    voIntroFresh,
    musicTrimStartSec
  )
}

/**
 * Inicia un render en Creatomate con el JSON editado en el Preview SDK (mismo formato que la API).
 */
export async function startCreatomateRenderFromClientScript(
  jobId: string,
  script: CreatomateFlatRenderScript
): Promise<{ renderId: string }> {
  const supabase = getServiceClient()
  const { data: job, error } = await supabase.from('video_jobs_v2').select('id').eq('id', jobId).single()
  if (error || !job) {
    throw new Error('Job no encontrado')
  }

  await updateJob(jobId, {
    status: 'rendering',
    current_step: 'Render desde editor Creatomate (Preview SDK)…',
    progress_percentage: 82,
    final_video_url: null,
    final_video_duration: null,
    error_message: null,
  })

  const renderId = await submitCreatomateRenderForJob(jobId, script)

  await updateJob(jobId, {
    creatomate_render_id: renderId,
    progress_percentage: 85,
    current_step: `Render enviado a Creatomate (ID: ${renderId}). Esperando resultado…`,
  })

  setImmediate(() => {
    monitorCreatomateRenderFallback(jobId, renderId).catch((e) =>
      console.error(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Error fatal (preview export): ${e}`)
    )
  })

  console.log(`[VideoV2Pipeline][${jobId}] Render desde Preview SDK. Creatomate ID=${renderId}`)
  return { renderId }
}

export async function rerunCreatomateRenderForJob(
  jobId: string,
  geminiAnalysisOverride?: unknown,
  opts?: { musicTrackIdOverride?: string; musicTrimStartSecOverride?: number | null }
): Promise<{ renderId: string }> {
  const supabase = getServiceClient()
  const { data: job, error } = await supabase
    .from('video_jobs_v2')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new Error('Job no encontrado')
  }
  const paths = job.raw_video_paths ?? []
  if (paths.length === 0) {
    throw new Error('Job sin raw_video_paths')
  }
  if (!job.music_track_url && !opts?.musicTrackIdOverride) {
    throw new Error('Job sin música asignada')
  }
  const musicTrackUrl =
    opts?.musicTrackIdOverride != null
      ? await resolveMusicTrackUrlById(opts.musicTrackIdOverride)
      : (job.music_track_url as string)
  const hasMusicTrimOverride =
    opts != null && Object.prototype.hasOwnProperty.call(opts, 'musicTrimStartSecOverride')
  const musicTrimStartSecOverride = hasMusicTrimOverride
    ? normalizeMusicTrimStartSec(opts?.musicTrimStartSecOverride ?? undefined)
    : undefined

  const allSegments = parseSegmentMapJson(job.segment_map)
  const rawAnalysis = geminiAnalysisOverride ?? job.gemini_analysis
  const analysis = coerceGeminiAnalysisFromUnknown(rawAnalysis, jobId)
  assertSequenceMatchesStoredSegments(analysis, allSegments, jobId)

  let kinds = defaultClipKinds(paths.length)
  let clipDurationsSecInput: (number | null)[] | undefined
  let voiceOverBaseClipIndex: number | undefined
  let voiceOverOverlayClipIndicesFromMeta: number[] | undefined
  let voiceOverAudioPathFromMeta: string | undefined
  let voiceOverMp3DurationSecFromMeta: number | undefined
  let musicTrimStartSecFromMeta: number | undefined
  const sc = job.selected_clips
  if (isPipelineInputMeta(sc)) {
    if (Array.isArray(sc.clipKinds) && sc.clipKinds.length === paths.length) {
      kinds = normalizeClipKindsInput(sc.clipKinds, paths.length)
    }
    if (Array.isArray(sc.clipDurationsSec) && sc.clipDurationsSec.length === paths.length) {
      clipDurationsSecInput = normalizeClipDurationsInput(sc.clipDurationsSec, paths.length)
    }
    if (typeof sc.voiceOverBaseClipIndex === 'number') {
      voiceOverBaseClipIndex = sc.voiceOverBaseClipIndex
    }
    if (typeof sc.voiceOverAudioPath === 'string' && sc.voiceOverAudioPath.trim().length > 0) {
      voiceOverAudioPathFromMeta = sc.voiceOverAudioPath.trim()
    }
    if (
      typeof sc.voiceOverMp3DurationSec === 'number' &&
      Number.isFinite(sc.voiceOverMp3DurationSec) &&
      sc.voiceOverMp3DurationSec > 0.2
    ) {
      voiceOverMp3DurationSecFromMeta = Number(sc.voiceOverMp3DurationSec.toFixed(3))
    }
    musicTrimStartSecFromMeta = normalizeMusicTrimStartSec(sc.musicTrimStartSec)
    if (
      voiceOverAudioPathFromMeta &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const normMp3 = normalizeVoiceOverMp3OverlayIndices(sc.voiceOverOverlayClipIndices, paths.length)
      if (normMp3 && normMp3.length > 0) voiceOverOverlayClipIndicesFromMeta = normMp3
    } else if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm && norm.length > 0) voiceOverOverlayClipIndicesFromMeta = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }
  const effectiveMusicTrimStartSec = hasMusicTrimOverride
    ? musicTrimStartSecOverride
    : musicTrimStartSecFromMeta

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))

  const freshClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const scriptStRerun =
    typeof job.script_text === 'string' && job.script_text.trim().length > 0 ? job.script_text : null
  const { subtitleBlocks: autoSubtitleBlocks, adjustedSrt: autoAdjustedSrt, voiceOverIntro } =
    await computeAutomaticSubtitlePayload({
      jobId,
      paths,
      analysis,
      allSegments,
      kinds,
      clipDurationsSecInput,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndices: voiceOverOverlayClipIndicesFromMeta,
      voiceOverAudioPath: voiceOverAudioPathFromMeta,
      voiceOverMp3DurationSec: voiceOverMp3DurationSecFromMeta,
      clipFilenames,
      signedClipUrls: freshClipUrls,
      scriptTextForSubtitles: scriptStRerun,
    })

  let subtitleBlocks = autoSubtitleBlocks
  let adjustedSrt = autoAdjustedSrt
  try {
    const ovr = parseSubtitleBlocksOverride(job.subtitle_blocks_override)
    if (ovr && ovr.length > 0) {
      subtitleBlocks = ovr
      adjustedSrt = buildAdjustedSrtFromSubtitleBlocks(ovr)
    }
  } catch (e) {
    console.warn(
      `[VideoV2Pipeline][${jobId}] subtitle_blocks_override inválido, se usan subtítulos automáticos: ${e}`
    )
  }

  let geminiAnalysisPatch: GeminiSegmentAnalysisResult | undefined
  if (voiceOverIntro != null) {
    const ins = Math.max(
      0,
      Math.min(analysis.voice_over_insert_after_count ?? 0, analysis.sequence.length)
    )
    const afterS = analysis.sequence.slice(ins)
    const beforeS = analysis.sequence.slice(0, ins)
    const d0 = sumSequenceItemsDurationSec(beforeS)
    geminiAnalysisPatch = {
      ...analysis,
      total_duration: Number(
        (d0 + voiceOverIntro.voDurationSec + sumSequenceItemsDurationSec(afterS)).toFixed(3)
      ),
    }
  }

  const analysisToStore = geminiAnalysisPatch ?? analysis

  await updateJob(jobId, {
    gemini_analysis: analysisToStore,
    adjusted_srt: adjustedSrt,
    music_track_url: musicTrackUrl,
    ...(hasMusicTrimOverride
      ? {
          selected_clips: isPipelineInputMeta(sc)
            ? {
                ...(sc as Record<string, unknown>),
                _v2_pipeline_input: true,
                musicTrimStartSec: effectiveMusicTrimStartSec ?? null,
              }
            : { _v2_pipeline_input: true, musicTrimStartSec: effectiveMusicTrimStartSec ?? null },
        }
      : {}),
    status: 'rendering',
    current_step: 'Re-render: enviando a Shotstack…',
    progress_percentage: 82,
    final_video_url: null,
    final_video_duration: null,
    error_message: null,
  })

  const voIntroForRender = await refreshVoiceOverIntroAudioUrl(voiceOverIntro)
  const brandConfig = brandConfigFromJobRow(job)
  const escenasRerun = await loadGuionEscenasForPipelineJob(jobId, allSegments)

  subtitleBlocks = await applyDriveSubtitleNormalization(jobId, subtitleBlocks)

  subtitleBlocks = applyBrandSubtitleDedupWhenNoGuion(
    subtitleBlocks,
    brandConfig,
    escenasRerun.length > 0,
    jobId
  )

  let comentaMentionTimeSecRerun: number | undefined
  let comentaOverlayTextRerun: string | undefined
  {
    const comenta = applyComentaWhenNoGuion(
      subtitleBlocks,
      analysis.sequence,
      allSegments,
      escenasRerun.length > 0,
      brandConfig,
      jobId
    )
    subtitleBlocks = comenta.subtitleBlocks
    comentaMentionTimeSecRerun = comenta.comentaMentionTimeSec
    comentaOverlayTextRerun = comenta.comentaOverlayText
  }

  subtitleBlocks = await applyShowcaseCaptionHighlights(
    jobId,
    subtitleBlocks,
    analysis.sequence,
    brandConfig
  )

  const renderId = await renderSegmentsV2(
    jobId,
    analysis.sequence,
    freshClipUrls,
    subtitleBlocks,
    musicTrackUrl,
    voIntroForRender,
    {
      musicTrimStartSecOverride: effectiveMusicTrimStartSec,
      brandConfig,
      comentaMentionTimeSec: comentaMentionTimeSecRerun,
      comentaOverlayText: comentaOverlayTextRerun,
    }
  )

  await updateJob(jobId, {
    creatomate_render_id: renderId,
    progress_percentage: 85,
    current_step: `Render enviado a Shotstack (ID: ${renderId}). Esperando resultado…`,
  })

  setImmediate(() => {
    monitorShotstackRenderFallback(jobId, renderId).catch((e) =>
      console.error(`[VideoV2Pipeline][${jobId}][ShotstackMonitor] Error fatal (re-render): ${e}`)
    )
  })

  console.log(`[VideoV2Pipeline][${jobId}] Re-render iniciado. Shotstack ID=${renderId}`)
  return { renderId }
}

/**
 * Guarda ediciones manuales (subtítulos y/o recortes de cortes) sin re-transcribir.
 */
export async function applyVideoJobEditorPatch(
  jobId: string,
  patch: {
    subtitle_blocks_override?: unknown | null
    sequence?: SequenceItem[]
  }
): Promise<void> {
  const supabase = getServiceClient()
  const fields: {
    subtitle_blocks_override?: unknown
    gemini_analysis?: unknown
  } = {}

  if ('subtitle_blocks_override' in patch) {
    const v = patch.subtitle_blocks_override
    if (v === null) {
      fields.subtitle_blocks_override = null
    } else {
      const parsed = parseSubtitleBlocksOverride(v)
      fields.subtitle_blocks_override = parsed && parsed.length > 0 ? parsed : null
    }
  }

  if (patch.sequence != null) {
    const { data: job, error } = await supabase
      .from('video_jobs_v2')
      .select('gemini_analysis, segment_map')
      .eq('id', jobId)
      .single()
    if (error || !job?.gemini_analysis || !job.segment_map) {
      throw new Error('Job sin gemini_analysis o segment_map')
    }
    const allSegments = parseSegmentMapJson(job.segment_map)
    const analysis = coerceGeminiAnalysisFromUnknown(job.gemini_analysis, jobId)
    const clamped = clampSequenceToSegmentBounds(patch.sequence, allSegments)
    assertSequenceMatchesStoredSegments(
      { ...analysis, sequence: clamped },
      allSegments,
      jobId
    )
    clamped.forEach((it, i) => {
      it.order = i + 1
    })
    const total_duration = Number(clamped.reduce((s, x) => s + x.trim_duration, 0).toFixed(3))
    fields.gemini_analysis = {
      ...analysis,
      sequence: clamped,
      total_duration,
    }
  }

  if (Object.keys(fields).length === 0) {
    throw new Error('Nada que guardar: envía subtitle_blocks_override o sequence')
  }

  await updateJob(jobId, fields)
}

// ──────────────────────────────────────────────
// Punto de entrada público
// ──────────────────────────────────────────────

export interface PipelineFile {
  buffer: Buffer
  filename: string
  mimeType: string
  alreadyUploaded?: boolean
  path?: string
  signedUrl?: string
}

export function startPipelineBackground(params: {
  jobId: string
  flowType: FlowType
  files: PipelineFile[]
  musicTrackUrl: string
  clipKinds?: VideoClipKind[]
  clipDurationsSec?: (number | null)[]
  /** Índice del clip cuyo audio completo va como voz en off (solo flujo múltiple). */
  voiceOverBaseClipIndex?: number
  /** Clips encima del bloque VO (solo vídeo; audio mute en render), en el orden elegido. */
  voiceOverOverlayClipIndices?: number[]
  /** Ruta Storage del MP3/WAV de VO (excluyente con voiceOverBaseClipIndex). */
  voiceOverAudioPath?: string
  voiceOverMp3DurationSec?: number
  musicTrimStartSec?: number
}) {
  const {
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
    musicTrimStartSec,
  } = params

  if (flowType === 'single') {
    const f = files[0]
    setImmediate(() => {
      if (f.alreadyUploaded && f.path && f.signedUrl) {
        runSingleVideoPipelineFromStorage(jobId, f.path, f.signedUrl, musicTrackUrl, musicTrimStartSec).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] Unhandled error en single pipeline: ${e}`)
        )
      } else {
        console.error(`[VideoV2Pipeline][${jobId}] Flujo single requiere archivo pre-subido a Storage.`)
        void updateJob(jobId, { status: 'failed', error_message: 'Archivo no encontrado en Storage.' }).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] No se pudo marcar job fallido: ${e}`)
        )
      }
    })
  } else {
    setImmediate(() => {
      const allPreUploaded = files.every((f) => f.alreadyUploaded && f.path && f.signedUrl)
      if (allPreUploaded) {
        runMultipleClipsPipelineFromStorage(
          jobId,
          files,
          musicTrackUrl,
          clipKinds,
          clipDurationsSec,
          voiceOverBaseClipIndex,
          voiceOverOverlayClipIndices,
          voiceOverAudioPath,
          voiceOverMp3DurationSec,
          musicTrimStartSec
        ).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] Unhandled error en multiple pipeline: ${e}`)
        )
      } else {
        console.error(`[VideoV2Pipeline][${jobId}] Flujo multiple requiere archivos pre-subidos a Storage.`)
        void updateJob(jobId, { status: 'failed', error_message: 'Archivos no encontrados en Storage.' }).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] No se pudo marcar job fallido: ${e}`)
        )
      }
    })
  }
}
