import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType, GeminiSegmentAnalysisResult, VideoJobStatus } from './types'
import { getSignedUrlForPath } from './storage'
import { transcribeVideoV2, type RawWord } from './assemblyai'
import {
  buildAdjustedSRT,
  buildAdjustedSRTForVoiceOverIntro,
  buildAdjustedSrtFromSubtitleBlocks,
  buildSubtitleBlocks,
  buildSubtitleBlocksForVoiceOverIntro,
  buildVisualOnlyPlaceholderSegment,
  clampSequenceToSegmentBounds,
  formatSegmentMapForPrompt,
  offsetSubtitleBlocks,
  refineSpokenSegmentsForOneClip,
  sumSequenceItemsDurationSec,
} from './segmenter'
import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import type { VideoClipKind } from './clip-config'
import {
  defaultClipKinds,
  isPipelineInputMeta,
  normalizeClipDurationsInput,
  normalizeClipKindsInput,
  normalizeVoiceOverOverlayClipIndices,
} from './clip-config'
import { tryProbeVideoDurationSecondsFromUrl } from './probe-video'
import { analyzeSegments } from './gemini'
import {
  buildCreatomateRenderScript,
  getCreatomateRenderStatus,
  renderSegmentsV2,
  submitCreatomateRenderForJob,
  type CreatomateFlatRenderScript,
  type VoiceOverIntroRenderInput,
} from './creatomate'
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

async function fetchJobScriptGuidanceText(jobId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('video_jobs_v2')
    .select('script_text')
    .eq('id', jobId)
    .single()
  if (error || !data?.script_text?.trim()) return null
  return data.script_text.trim()
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
  }>
) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('video_jobs_v2')
    .update(fields as Record<string, unknown>)
    .eq('id', jobId)

  if (error) {
    console.error(`[VideoV2Pipeline][${jobId}] Error actualizando job: ${error.message}`)
  }
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
  musicTrackUrl: string
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
    const scriptGuidanceText = await fetchJobScriptGuidanceText(jobId)
    const analysis = await analyzeSegments(
      formattedMap,
      segments,
      jobId,
      googleRefs,
      useVisualAnalysis,
      [],
      scriptGuidanceText ? { scriptGuidanceText } : undefined
    )
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
    const subtitleBlocks = buildSubtitleBlocks(analysis.sequence, segments)
    const adjustedSrt = buildAdjustedSRT(analysis.sequence, segments)
    await updateJob(jobId, { adjusted_srt: adjustedSrt, progress_percentage: 75 })
    console.log(`[VideoV2Pipeline][${jobId}][A4] ${subtitleBlocks.length} bloques de subtítulos generados`)

    // A5 — Renderizado Creatomate
    console.log(`[VideoV2Pipeline][${jobId}][A5] Enviando a Creatomate`)
    await updateJob(jobId, {
      status: 'rendering',
      current_step: 'Creatomate está renderizando el Reel en alta calidad...',
      progress_percentage: 80,
    })

    const freshSignedUrl = await getSignedUrlForPath(storagePath)
    const clipUrls = [freshSignedUrl]

    const renderId = await renderSegmentsV2(jobId, analysis.sequence, clipUrls, subtitleBlocks, musicTrackUrl)
    await updateJob(jobId, {
      creatomate_render_id: renderId,
      progress_percentage: 85,
      current_step: `Render enviado a Creatomate (ID: ${renderId}). Esperando resultado...`,
    })

    setImmediate(() => {
      monitorCreatomateRenderFallback(jobId, renderId).catch((e) =>
        console.error(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Error fatal: ${e}`)
      )
    })

    console.log(`[VideoV2Pipeline][${jobId}] Pipeline A completado. Esperando Creatomate.`)
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
  voiceOverOverlayClipIndices?: number[]
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

    // B3 — Análisis con Gemini (visual + texto, o solo texto como fallback)
    console.log(`[VideoV2Pipeline][${jobId}][B3] Analizando con Gemini (${useVisualAnalysis ? 'visual+texto' : 'solo texto'})`)
    await updateJob(jobId, {
      status: 'analyzing',
      current_step: useVisualAnalysis
        ? 'Gemini está analizando los videos y seleccionando los mejores momentos visualmente...'
        : 'Gemini IA seleccionando y ordenando los mejores momentos...',
      progress_percentage: 55,
    })

    const segmentsForGeminiPrompt =
      voiceOverBaseClipIndex != null
        ? allSegments.filter(
            (s) => s.clip_index !== voiceOverBaseClipIndex && s.source_kind !== 'visual_only'
          )
        : allSegments
    const formattedMap = formatSegmentMapForPrompt(segmentsForGeminiPrompt)
    const scriptGuidanceText = await fetchJobScriptGuidanceText(jobId)
    const geminiOpts =
      voiceOverBaseClipIndex != null || scriptGuidanceText
        ? {
            ...(voiceOverBaseClipIndex != null
              ? { manualVoiceOverBaseClipIndex: voiceOverBaseClipIndex }
              : {}),
            ...(scriptGuidanceText ? { scriptGuidanceText } : {}),
          }
        : undefined
    const analysis = await analyzeSegments(
      formattedMap,
      allSegments,
      jobId,
      googleFileRefs,
      useVisualAnalysis,
      kinds,
      geminiOpts
    )
    await updateJob(jobId, { gemini_analysis: analysis, progress_percentage: 70 })

    if (voiceOverBaseClipIndex != null && analysis.sequence.length === 0) {
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
    const { subtitleBlocks, adjustedSrt, voiceOverIntro } = await computeAutomaticSubtitlePayload({
      jobId,
      paths,
      analysis,
      allSegments,
      kinds,
      clipDurationsSecInput,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndices,
      clipFilenames,
      signedClipUrls: signedUrls,
    })

    let geminiAnalysisPatch: typeof analysis | undefined
    if (voiceOverBaseClipIndex != null && voiceOverIntro != null) {
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

    // B5 — Renderizado Creatomate
    console.log(`[VideoV2Pipeline][${jobId}][B5] Enviando a Creatomate`)
    await updateJob(jobId, {
      status: 'rendering',
      current_step: 'Creatomate está renderizando el Reel en alta calidad...',
      progress_percentage: 80,
    })

    const freshClipUrls = await Promise.all(
      paths.map((p) => getSignedUrlForPath(p))
    )

    const renderId = await renderSegmentsV2(
      jobId,
      analysis.sequence,
      freshClipUrls,
      subtitleBlocks,
      musicTrackUrl,
      voiceOverIntro
    )
    await updateJob(jobId, {
      creatomate_render_id: renderId,
      progress_percentage: 85,
      current_step: `Render enviado a Creatomate (ID: ${renderId}). Esperando resultado...`,
    })

    setImmediate(() => {
      monitorCreatomateRenderFallback(jobId, renderId).catch((e) =>
        console.error(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Error fatal: ${e}`)
      )
    })

    console.log(`[VideoV2Pipeline][${jobId}] Pipeline B completado. Esperando Creatomate.`)
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
  clipFilenames: string[]
  signedClipUrls: string[]
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
    voiceOverOverlayClipIndices: voOverlayInput,
    clipFilenames,
    signedClipUrls,
  } = params

  let subtitleBlocks = buildSubtitleBlocks(analysis.sequence, allSegments)
  let adjustedSrt = buildAdjustedSRT(analysis.sequence, allSegments)
  let voiceOverIntro: VoiceOverIntroRenderInput | null = null

  const voOverlayResolved =
    voiceOverBaseClipIndex != null && voOverlayInput && voOverlayInput.length > 0
      ? normalizeVoiceOverOverlayClipIndices(voOverlayInput, paths.length, voiceOverBaseClipIndex)
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
    const voDur = await resolveVoiceOverTrackDurationSec(
      voiceOverBaseClipIndex,
      clipDurationsSecInput,
      allSegments,
      signedClipUrls[voiceOverBaseClipIndex],
      jobId
    )
    const insertAfter = Math.max(
      0,
      Math.min(analysis.voice_over_insert_after_count ?? 0, analysis.sequence.length)
    )
    const beforeSeq = analysis.sequence.slice(0, insertAfter)
    const afterSeq = analysis.sequence.slice(insertAfter)
    const dBefore = sumSequenceItemsDurationSec(beforeSeq)

    const brollOrderAuto = kinds
      .map((k, i) => ({ k, i }))
      .filter(({ k, i }) => k === 'visual_only' && i !== voiceOverBaseClipIndex)
      .map(({ i }) => i)
    const brollOrder = voOverlayResolved && voOverlayResolved.length > 0 ? voOverlayResolved : brollOrderAuto

    const voBrollTiles =
      voOverlayResolved && voOverlayResolved.length > 0
        ? planLinearBrollTiling(voDur, voOverlayResolved, clipDurationsForRender)
        : buildSemanticVoiceOverBrollTiles(
            voDur,
            brollOrder,
            clipDurationsForRender,
            analysis.sequence,
            allSegments,
            voiceOverBaseClipIndex,
            clipFilenames
          )
    voiceOverIntro = {
      voClipIndex: voiceOverBaseClipIndex,
      voDurationSec: voDur,
      brollClipIndicesInFileOrder: brollOrder,
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
      voOverlayResolved && voOverlayResolved.length > 0
        ? `overlays manuales [${voOverlayResolved.join(',')}] lineales`
        : `${brollOrder.length} B-roll auto, ${voBrollTiles.length} ventanas`
    console.log(
      `[VideoV2Pipeline][${jobId}][B4] Modo VO: bloque ${voDur}s tras ${insertAfter} cortes; ${overlayNote}`
    )
  }

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
  let voiceOverOverlayClipIndices: number[] | undefined
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
    if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm.length > 0) voiceOverOverlayClipIndices = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))
  const signedClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const { subtitleBlocks: autoBlocks } = await computeAutomaticSubtitlePayload({
    jobId,
    paths,
    analysis,
    allSegments,
    kinds,
    clipDurationsSecInput,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices,
    clipFilenames,
    signedClipUrls,
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
  let voiceOverOverlayClipIndices: number[] | undefined
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
    if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm.length > 0) voiceOverOverlayClipIndices = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))

  const freshClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const { subtitleBlocks: autoSubtitleBlocks, voiceOverIntro } = await computeAutomaticSubtitlePayload({
    jobId,
    paths,
    analysis,
    allSegments,
    kinds,
    clipDurationsSecInput,
    voiceOverBaseClipIndex,
    voiceOverOverlayClipIndices,
    clipFilenames,
    signedClipUrls: freshClipUrls,
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

  return buildCreatomateRenderScript(
    jobId,
    analysis.sequence,
    freshClipUrls,
    subtitleBlocks,
    job.music_track_url,
    voiceOverIntro
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
  geminiAnalysisOverride?: unknown
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
  if (!job.music_track_url) {
    throw new Error('Job sin música asignada')
  }

  const allSegments = parseSegmentMapJson(job.segment_map)
  const rawAnalysis = geminiAnalysisOverride ?? job.gemini_analysis
  const analysis = coerceGeminiAnalysisFromUnknown(rawAnalysis, jobId)
  assertSequenceMatchesStoredSegments(analysis, allSegments, jobId)

  let kinds = defaultClipKinds(paths.length)
  let clipDurationsSecInput: (number | null)[] | undefined
  let voiceOverBaseClipIndex: number | undefined
  let voiceOverOverlayClipIndices: number[] | undefined
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
    if (
      typeof sc.voiceOverBaseClipIndex === 'number' &&
      Array.isArray(sc.voiceOverOverlayClipIndices) &&
      sc.voiceOverOverlayClipIndices.length > 0
    ) {
      const norm = normalizeVoiceOverOverlayClipIndices(
        sc.voiceOverOverlayClipIndices,
        paths.length,
        sc.voiceOverBaseClipIndex
      )
      if (norm.length > 0) voiceOverOverlayClipIndices = norm
    }
  }
  if (voiceOverBaseClipIndex != null && paths.length < 2) {
    voiceOverBaseClipIndex = undefined
  }

  const clipFilenames = paths.map((p) => decodeURIComponent(p.split('/').pop() || 'clip.mp4'))

  const freshClipUrls = await Promise.all(paths.map((p) => getSignedUrlForPath(p)))

  const { subtitleBlocks: autoSubtitleBlocks, adjustedSrt: autoAdjustedSrt, voiceOverIntro } =
    await computeAutomaticSubtitlePayload({
      jobId,
      paths,
      analysis,
      allSegments,
      kinds,
      clipDurationsSecInput,
      voiceOverBaseClipIndex,
      voiceOverOverlayClipIndices,
      clipFilenames,
      signedClipUrls: freshClipUrls,
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
  if (voiceOverBaseClipIndex != null && voiceOverIntro != null) {
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
    status: 'rendering',
    current_step: 'Re-render: enviando a Creatomate…',
    progress_percentage: 82,
    final_video_url: null,
    final_video_duration: null,
    error_message: null,
  })

  const renderId = await renderSegmentsV2(
    jobId,
    analysis.sequence,
    freshClipUrls,
    subtitleBlocks,
    job.music_track_url,
    voiceOverIntro
  )

  await updateJob(jobId, {
    creatomate_render_id: renderId,
    progress_percentage: 85,
    current_step: `Render enviado a Creatomate (ID: ${renderId}). Esperando resultado…`,
  })

  setImmediate(() => {
    monitorCreatomateRenderFallback(jobId, renderId).catch((e) =>
      console.error(`[VideoV2Pipeline][${jobId}][CreatomateMonitor] Error fatal (re-render): ${e}`)
    )
  })

  console.log(`[VideoV2Pipeline][${jobId}] Re-render iniciado. Creatomate ID=${renderId}`)
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
  /** Índice del clip cuyo audio completo abre el Reel (solo flujo múltiple). */
  voiceOverBaseClipIndex?: number
  /** Con VO manual: clips encima (orden lineal, mute en render). */
  voiceOverOverlayClipIndices?: number[]
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
  } = params

  if (flowType === 'single') {
    const f = files[0]
    setImmediate(() => {
      if (f.alreadyUploaded && f.path && f.signedUrl) {
        runSingleVideoPipelineFromStorage(jobId, f.path, f.signedUrl, musicTrackUrl).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] Unhandled error en single pipeline: ${e}`)
        )
      } else {
        console.error(`[VideoV2Pipeline][${jobId}] Flujo single requiere archivo pre-subido a Storage.`)
        updateJob(jobId, { status: 'failed', error_message: 'Archivo no encontrado en Storage.' })
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
          voiceOverOverlayClipIndices
        ).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] Unhandled error en multiple pipeline: ${e}`)
        )
      } else {
        console.error(`[VideoV2Pipeline][${jobId}] Flujo multiple requiere archivos pre-subidos a Storage.`)
        updateJob(jobId, { status: 'failed', error_message: 'Archivos no encontrados en Storage.' })
      }
    })
  }
}
