import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType, VideoJobStatus } from './types'
import { getSignedUrlForPath } from './storage'
import { transcribeVideoV2 } from './assemblyai'
import { buildSegmentMap, buildAdjustedSRT, buildSubtitleBlocks, formatSegmentMapForPrompt } from './segmenter'
import type { Segment } from './segmenter'
import { analyzeSegments } from './gemini'
import { renderSegmentsV2, getCreatomateRenderStatus } from './creatomate'
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

async function updateJob(
  jobId: string,
  fields: Partial<{
    status: VideoJobStatus
    current_step: string
    progress_percentage: number
    error_message: string
    assemblyai_transcript_id: string
    srt_content: string
    gemini_analysis: unknown
    creatomate_render_id: string
    final_video_url: string
    final_video_duration: number
    raw_video_paths: string[]
    selected_clips: unknown
    segment_map: unknown
    adjusted_srt: string
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

    const segments = buildSegmentMap(rawWords, 0)
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
    const analysis = await analyzeSegments(formattedMap, segments, jobId, googleRefs, useVisualAnalysis)
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

async function runMultipleClipsPipelineFromStorage(
  jobId: string,
  files: PipelineFile[],
  musicTrackUrl: string
) {
  let googleFileRefs: GoogleFileRef[] = []

  try {
    const paths = files.map((f) => f.path!)
    const signedUrls = files.map((f) => f.signedUrl!)

    // B1 — EN PARALELO: Transcripción de todos los clips + Preparación visual
    console.log(`[VideoV2Pipeline][${jobId}][B1] Iniciando transcripción + preparación visual de ${files.length} clips en paralelo`)
    await updateJob(jobId, {
      status: 'transcribing',
      current_step: `Transcribiendo ${files.length} clips y preparando análisis visual en paralelo...`,
      progress_percentage: 20,
    })

    const [transcriptionResults, fileRefsResult] = await Promise.allSettled([
      Promise.all(signedUrls.map((url, i) => transcribeVideoV2(url, `${jobId}_clip${i}`))),
      prepareMultipleVideosForGemini(signedUrls, jobId),
    ])

    // Transcripciones son obligatorias
    if (transcriptionResults.status === 'rejected') {
      throw new Error(`Error en transcripción de clips: ${transcriptionResults.reason}`)
    }
    const transcriptions = transcriptionResults.value

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

    const combinedSrt = transcriptions.map((r) => r.srtContent).join('\n\n')
    const firstTranscriptId = transcriptions[0].transcriptId
    await updateJob(jobId, {
      assemblyai_transcript_id: firstTranscriptId,
      srt_content: combinedSrt,
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
      const clipSegments = buildSegmentMap(transcriptions[i].rawWords, i)
      allSegments.push(...clipSegments)
    }

    await updateJob(jobId, { segment_map: allSegments })
    console.log(`[VideoV2Pipeline][${jobId}][B2] ${allSegments.length} segmentos totales de ${files.length} clips`)

    if (allSegments.length === 0) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: 'No se detectó habla en ninguno de los clips.',
      })
      return
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

    const formattedMap = formatSegmentMapForPrompt(allSegments)
    const analysis = await analyzeSegments(formattedMap, allSegments, jobId, googleFileRefs, useVisualAnalysis)
    await updateJob(jobId, { gemini_analysis: analysis, progress_percentage: 70 })

    // B3b — Limpiar archivos de Google
    if (googleFileRefs.length > 0) {
      try {
        await cleanupMultipleGoogleFiles(googleFileRefs, jobId)
      } catch (cleanupErr) {
        console.warn(`[VideoV2Pipeline][${jobId}] Error limpiando Google Files (non-fatal): ${cleanupErr}`)
      }
      googleFileRefs = []
    }

    // B4 — Construir subtítulos
    console.log(`[VideoV2Pipeline][${jobId}][B4] Construyendo subtítulos`)
    const subtitleBlocks = buildSubtitleBlocks(analysis.sequence, allSegments)
    const adjustedSrt = buildAdjustedSRT(analysis.sequence, allSegments)
    await updateJob(jobId, { adjusted_srt: adjustedSrt, progress_percentage: 75 })
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

    const renderId = await renderSegmentsV2(jobId, analysis.sequence, freshClipUrls, subtitleBlocks, musicTrackUrl)
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
}) {
  const { jobId, flowType, files, musicTrackUrl } = params

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
        runMultipleClipsPipelineFromStorage(jobId, files, musicTrackUrl).catch((e) =>
          console.error(`[VideoV2Pipeline][${jobId}] Unhandled error en multiple pipeline: ${e}`)
        )
      } else {
        console.error(`[VideoV2Pipeline][${jobId}] Flujo multiple requiere archivos pre-subidos a Storage.`)
        updateJob(jobId, { status: 'failed', error_message: 'Archivos no encontrados en Storage.' })
      }
    })
  }
}
