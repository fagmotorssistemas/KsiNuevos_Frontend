/**
 * Creatomate V2 — Render de alta calidad para Reels/TikTok (9:16).
 *
 * - Video: Ken Burns (scale scope element, solo >=100%) + transición fade in rápida entre clips.
 * - Subtítulos: transcripción nativa de Creatomate con transcript_effect "highlight"
 *   (una capa de texto por segmento de vídeo, transcript_source → id del clip).
 * - subtitleBlocks solo alimenta SFX pop (timings AssemblyAI).
 */

import type { SequenceItem, SubtitleBlock } from './segmenter'

const CREATOMATE_API_BASE = 'https://api.creatomate.com/v1'
const TIMEOUT_MS = 30_000

/** Fade entre clips: corta y con easing seco para sensación “brusca” / dinámica. */
const TRANSITION_DURATION = 0.2

const SFX_WHOOSH_URL = process.env.VIDEO_V2_SFX_WHOOSH_URL || ''
const SFX_POP_URL = process.env.VIDEO_V2_SFX_POP_URL || ''

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function getWebhookUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL
  if (!baseUrl) {
    throw new Error('APP_PUBLIC_URL no está configurada. Debe apuntar a la URL pública del frontend.')
  }
  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${normalized}/api/videos-v2/webhook/creatomate`
}

interface CreatomateRenderResponse {
  id: string
  status: string
  url?: string
  error_message?: string
  duration?: number
}

async function postRender(body: Record<string, unknown>): Promise<CreatomateRenderResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    console.log(`[VideoV2Creatomate] POST /renders body (${JSON.stringify(body).length} chars)`)

    const res = await fetch(`${CREATOMATE_API_BASE}/renders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Creatomate HTTP ${res.status}: ${errText}`)
    }

    const data = (await res.json()) as CreatomateRenderResponse | CreatomateRenderResponse[]
    return Array.isArray(data) ? data[0] : data
  } finally {
    clearTimeout(timeout)
  }
}

export async function getCreatomateRenderStatus(renderId: string): Promise<CreatomateRenderResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${CREATOMATE_API_BASE}/renders/${renderId}`, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Creatomate status HTTP ${res.status}: ${errText}`)
    }

    return (await res.json()) as CreatomateRenderResponse
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Vídeos + capas de texto con highlight nativo (mismo índice i) ────────────

function buildVideoAndTranscriptLayers(
  sequence: SequenceItem[],
  clipUrls: string[]
): {
  videoElements: Record<string, unknown>[]
  transcriptElements: Record<string, unknown>[]
  totalDuration: number
  transitionTimes: number[]
} {
  const videoElements: Record<string, unknown>[] = []
  const transcriptElements: Record<string, unknown>[] = []
  const transitionTimes: number[] = []
  let timeAccumulator = 0

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]
    const clipUrl = clipUrls[item.clip_index] ?? clipUrls[0]
    const duration = Number(item.trim_duration.toFixed(3))
    const timeStart = Number(timeAccumulator.toFixed(3))

    const zoomIn = i % 2 === 0
    const startScale = zoomIn ? '112%' : '128%'
    const endScale = zoomIn ? '128%' : '112%'

    const animations: Record<string, unknown>[] = []

    if (i > 0) {
      animations.push({
        time: 0,
        duration: TRANSITION_DURATION,
        transition: true,
        type: 'fade',
        easing: 'cubic-in',
        enable: 'second-only',
      })
      transitionTimes.push(timeStart)
    }

    animations.push({
      easing: 'linear',
      type: 'scale',
      scope: 'element',
      start_scale: startScale,
      end_scale: endScale,
      fade: false,
    })

    const videoId = `video_${i}`

    videoElements.push({
      id: videoId,
      name: `Seg_${item.segment_id}`,
      type: 'video',
      track: 1,
      time: timeStart,
      duration,
      source: clipUrl,
      trim_start: Number(item.trim_start.toFixed(3)),
      fit: 'cover',
      clip: true,
      width: '100%',
      height: '100%',
      animations,
    })

    transcriptElements.push({
      id: `transcript_${i}`,
      type: 'text',
      track: 2,
      time: timeStart,
      duration,
      transcript_source: videoId,
      transcript_effect: 'highlight',
      transcript_split: 'word',
      transcript_placement: 'animate',
      transcript_maximum_length: 5,
      transcript_color: '#ff1700',
      fill_color: '#ffffff',
      stroke_color: '#000000',
      stroke_width: '1.5 vmin',
      shadow_color: 'rgba(0,0,0,0.55)',
      shadow_blur: '1.6 vmin',
      font_family: 'Montserrat',
      font_weight: 800,
      font_size: '8 vmin',
      line_height: '125%',
      text_transform: 'uppercase',
      y: '72%',
      width: '88%',
      height: '30%',
      x_alignment: '50%',
      y_alignment: '50%',
      background_color: 'rgba(0,0,0,0.18)',
      background_x_padding: '40%',
      background_y_padding: '22%',
      background_border_radius: '30%',
    })

    timeAccumulator += duration
  }

  return {
    videoElements,
    transcriptElements,
    totalDuration: Number(timeAccumulator.toFixed(3)),
    transitionTimes,
  }
}

// ─── SFX ─────────────────────────────────────────────────────────────────────

function buildTransitionSfxElements(transitionTimes: number[]): Record<string, unknown>[] {
  if (!SFX_WHOOSH_URL) return []

  return transitionTimes.map((time, i) => ({
    id: `sfx_whoosh_${i}`,
    type: 'audio',
    track: 4,
    time: Math.max(0, time - 0.02),
    duration: Math.max(0.15, TRANSITION_DURATION + 0.08),
    source: SFX_WHOOSH_URL,
    volume: '100%',
  }))
}

function buildSubtitleSfxElements(
  subtitleBlocks: SubtitleBlock[],
  totalDuration: number
): Record<string, unknown>[] {
  if (!SFX_POP_URL) return []

  const pops: { t: number; id: string }[] = []
  let id = 0

  for (const block of subtitleBlocks) {
    if (block.time >= totalDuration || !block.text.trim()) continue

    if (block.words && block.words.length > 0) {
      for (const w of block.words) {
        if (w.start < totalDuration) {
          pops.push({ t: w.start, id: `sfx_pop_${id++}` })
        }
      }
    } else {
      pops.push({ t: block.time, id: `sfx_pop_${id++}` })
    }
  }

  return pops.map((p) => ({
    id: p.id,
    type: 'audio',
    track: 5,
    time: p.t,
    duration: 0.35,
    source: SFX_POP_URL,
    volume: '95%',
  }))
}

function buildMusicElement(musicUrl: string, totalDuration: number): Record<string, unknown> {
  return {
    id: 'music',
    name: 'Musica',
    type: 'audio',
    track: 6,
    time: 0,
    duration: totalDuration,
    source: musicUrl,
    volume: '32%',
    audio_fade_out: 2,
  }
}

// ─── Render principal ────────────────────────────────────────────────────────

export async function renderSegmentsV2(
  jobId: string,
  sequence: SequenceItem[],
  clipUrls: string[],
  subtitleBlocks: SubtitleBlock[],
  musicUrl: string
): Promise<string> {
  console.log(`[VideoV2Pipeline][${jobId}][Creatomate] Render → ${sequence.length} segmentos (highlight nativo por clip)`)

  const webhookUrl = getWebhookUrl()

  const { videoElements, transcriptElements, totalDuration, transitionTimes } = buildVideoAndTranscriptLayers(
    sequence,
    clipUrls
  )
  const transitionSfx = buildTransitionSfxElements(transitionTimes)
  const subtitleSfx = buildSubtitleSfxElements(subtitleBlocks, totalDuration)
  const musicElement = buildMusicElement(musicUrl, totalDuration)

  const allElements = [
    ...videoElements,
    ...transcriptElements,
    ...transitionSfx,
    ...subtitleSfx,
    musicElement,
  ]

  const body = {
    webhook_url: webhookUrl,
    metadata: jobId,
    render_scale: 1,
    source: {
      output_format: 'mp4',
      width: 1080,
      height: 1920,
      frame_rate: 30,
      duration: totalDuration,
      elements: allElements,
    },
  }

  const sfxInfo = transitionSfx.length > 0 || subtitleSfx.length > 0
    ? `, ${transitionSfx.length} whoosh SFX, ${subtitleSfx.length} pop SFX`
    : ', SFX deshabilitados (sin URLs configuradas)'

  console.log(
    `[VideoV2Pipeline][${jobId}][Creatomate] 1080x1920, totalDuration=${totalDuration}s, ` +
    `${videoElements.length} clips, ${transcriptElements.length} capas transcript highlight${sfxInfo}, webhook_url=${webhookUrl}`
  )

  const result = await postRender(body)
  console.log(`[VideoV2Pipeline][${jobId}][Creatomate] Render iniciado. ID=${result.id} status=${result.status}`)
  return result.id
}
