/**
 * Creatomate V2 — Render de alta calidad para Reels/TikTok (9:16).
 *
 * - Video: entre cortes, solo un “golpe” de zoom in/out muy breve al inicio del clip (estilo CapCut), sin transiciones nativas Creatomate ni zoom lineal en toda la toma.
 * - visual_overlay: B-roll (mute) debajo y pista de audio separada para la voz.
 * - Opcional: bloque VO manual (audio completo + B-roll Assembly mute + negro); la posición en la timeline la elige Gemini (insertAfterSegmentCount).
 * - Subtítulos: texto explícito desde AssemblyAI (`subtitleBlocks`), capa alta para verse sobre B-roll VO;
 *   animaciones de entrada por palabra o por bloque. `subtitleBlocks` también alimenta SFX pop.
 */

import type { SequenceItem, SubtitleBlock } from './segmenter'
import { sumSequenceItemsDurationSec } from './segmenter'
import type { VoBrollTile } from './vo-broll-semantics'

/**
 * Fuerza API v2 para mantener consistencia de color con exportaciones manuales en Creatomate.
 * El payload legado v1 (`source: {...}`) puede producir diferencias de colorimetría según el pipeline.
 */
const CREATOMATE_API_VER = 'v2' as const
const CREATOMATE_API_BASE = 'https://api.creatomate.com/v2'
const TIMEOUT_MS = 30_000

/** Duración del golpe de escala solo al corte (no recorre el clip entero). */
const CUT_PUNCH_DURATION_SEC = 0.22

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

function buildCreatomateRenderRequestBody(
  webhookUrl: string,
  metadata: string,
  renderScript: {
    output_format: string
    width: number
    height: number
    duration: number
    elements: unknown[]
  }
): Record<string, unknown> {
  return {
    webhook_url: webhookUrl,
    metadata,
    ...renderScript,
  }
}

async function postRender(body: Record<string, unknown>): Promise<CreatomateRenderResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    console.log(
      `[VideoV2Creatomate] POST ${CREATOMATE_API_VER}/renders body (${JSON.stringify(body).length} chars)`
    )

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
// B-roll + voz en off: primero el plano (track bajo), encima el clip de audio (opacidad 0 %),
// subtítulos ligados al elemento que lleva el audio real.

/**
 * Tracks (Creatomate: 1–1000). Importante: no reutilizar el mismo track para vídeo B-roll VO y
 * otros elementos que compartan tiempo en el Reel (p. ej. SFX), o el motor puede truncar capas.
 */
const TRACK_VO_BLACK = 1
const TRACK_VIDEO_BASE = 1
const TRACK_TRANSITION_SFX = 4
/** Antes 5: chocaba con TRACK_VO_BROLL y los planos del bloque VO se cortaban a ~0,35s (pops). */
const TRACK_SUBTITLE_SFX = 7
const TRACK_VO_BROLL = 5
const TRACK_MUSIC = 6
const TRACK_VOICE_AUDIO = 14
/** Por encima del B-roll del VO (5) y del vídeo base; texto AssemblyAI, no re-transcripción Creatomate. */
const TRACK_MANUAL_CAPTIONS = 18

/** Bloque VO manual: audio completo + B-roll mute + negro; `timelineStartSec` = posición en el Reel. */
export interface VoiceOverIntroRenderInput {
  voClipIndex: number
  voDurationSec: number
  /** Índices de clips `visual_only` en orden de archivo (excluye el clip de VO). */
  brollClipIndicesInFileOrder: number[]
  /** Duración de cada archivo (misma longitud que clipUrls). */
  clipFileDurationsSec: (number | null)[]
  /** Cuántos segmentos narrativos van antes de este bloque (lo decide Gemini). */
  insertAfterSegmentCount: number
  /** Opcional; en render se recalcula desde `sequence` + `insertAfterSegmentCount`. */
  timelineStartSec?: number
  /** Si existe, sustituye el emplanado lineal por ventanas alineadas a la VO (semántica). */
  voBrollTiles?: VoBrollTile[]
}

/**
 * Entre cortes: zoom agresivo solo los primeros ~0,22 s del clip entrante (tipo CapCut), sin `transition: true`
 * de Creatomate (slide/fade) y sin escala lineal durante toda la duración del vídeo.
 */
function buildCutPunchAnimations(segmentIndex: number, includeCutPunch: boolean): Record<string, unknown>[] {
  if (!includeCutPunch) return []
  const zoomOutPunch = segmentIndex % 2 === 0
  if (zoomOutPunch) {
    return [
      {
        time: 0,
        duration: CUT_PUNCH_DURATION_SEC,
        type: 'scale',
        scope: 'element',
        start_scale: '128%',
        end_scale: '100%',
        easing: 'cubic-out',
        fade: false,
      },
    ]
  }
  return [
    {
      time: 0,
      duration: CUT_PUNCH_DURATION_SEC,
      type: 'scale',
      scope: 'element',
      start_scale: '82%',
      end_scale: '100%',
      easing: 'cubic-out',
      fade: false,
    },
  ]
}

/** Solo añade `animations` si hay golpe de corte (primer plano = plantilla simple, sin animaciones). */
function withOptionalCutPunchAnimations(
  el: Record<string, unknown>,
  segmentIndex: number,
  includeCutPunch: boolean
): Record<string, unknown> {
  const anims = buildCutPunchAnimations(segmentIndex, includeCutPunch)
  return anims.length > 0 ? { ...el, animations: anims } : el
}

function captionEntranceAnimations(): Record<string, unknown>[] {
  return [
    {
      time: 0,
      duration: 0.16,
      type: 'fade',
      easing: 'cubic-out',
      fade: false,
    },
    {
      time: 0,
      duration: 0.2,
      type: 'scale',
      easing: 'cubic-out',
      scope: 'element',
      start_scale: '78%',
      end_scale: '100%',
      fade: false,
    },
  ]
}

/**
 * Subtítulos con texto de AssemblyAI (misma fuente que SRT/bloques), visibles sobre B-roll del VO.
 * Por palabra si `block.words` existe; si no, un elemento por bloque.
 */
function buildManualCaptionElements(
  subtitleBlocks: SubtitleBlock[],
  totalDuration: number
): Record<string, unknown>[] {
  type Entry = { time: number; duration: number; text: string }
  const entries: Entry[] = []

  for (const block of subtitleBlocks) {
    if (block.words && block.words.length > 0) {
      for (const w of block.words) {
        const t = w.start
        if (t >= totalDuration - 0.02) continue
        const raw = w.text.trim()
        if (!raw) continue
        const durRaw = Math.max(0.16, w.end - w.start)
        const capped = Math.min(durRaw, Math.max(0.12, totalDuration - t))
        entries.push({ time: t, duration: Number(capped.toFixed(3)), text: raw })
      }
    } else {
      const t = block.time
      if (t >= totalDuration - 0.02) continue
      const raw = block.text.trim()
      if (!raw) continue
      const dur = Number(
        Math.max(0.24, Math.min(block.duration, totalDuration - t)).toFixed(3)
      )
      entries.push({ time: t, duration: dur, text: raw })
    }
  }

  return entries.map((entry, idx) => {
    const upper = entry.text.toUpperCase()
    const short = upper.length <= 12
    return {
      id: `cap_${idx}`,
      type: 'text',
      track: TRACK_MANUAL_CAPTIONS,
      time: Number(entry.time.toFixed(3)),
      duration: Number(Math.max(0.15, entry.duration).toFixed(3)),
      text: upper,
      fill_color: '#ffffff',
      stroke_color: '#000000',
      stroke_width: '1.65 vmin',
      shadow_color: 'rgba(0,0,0,0.6)',
      shadow_blur: '1.8 vmin',
      font_family: 'Montserrat',
      font_weight: 800,
      font_size: short ? '9.2 vmin' : '7.4 vmin',
      line_height: '120%',
      letter_spacing: short ? '2%' : '1%',
      text_transform: 'uppercase',
      y: '73%',
      width: '94%',
      height: '28%',
      x_alignment: '50%',
      y_alignment: '50%',
      background_color: 'rgba(0,0,0,0.42)',
      background_x_padding: '36%',
      background_y_padding: '18%',
      background_border_radius: '26%',
      animations: captionEntranceAnimations(),
    }
  })
}

function planVoiceOverBrollTiles(
  voDurationSec: number,
  brollIndices: number[],
  clipFileDurationsSec: (number | null)[],
  clipUrls: string[]
): { clipIndex: number; timeStart: number; duration: number; trimStart: number }[] {
  const tiles: { clipIndex: number; timeStart: number; duration: number; trimStart: number }[] = []
  let t = 0
  for (const idx of brollIndices) {
    if (t >= voDurationSec - 0.04) break
    if (!clipUrls[idx]) continue
    const fileDur = clipFileDurationsSec[idx]
    const dur =
      typeof fileDur === 'number' && Number.isFinite(fileDur) && fileDur > 0.05
        ? fileDur
        : Math.max(0.1, voDurationSec - t)
    const remaining = Math.max(0, voDurationSec - t)
    const useDur = Number(Math.min(dur, remaining).toFixed(3))
    if (useDur < 0.08) continue
    tiles.push({ clipIndex: idx, timeStart: t, duration: useDur, trimStart: 0 })
    t += useDur
  }
  return tiles
}

function buildVoiceOverIntroLayers(
  input: VoiceOverIntroRenderInput,
  clipUrls: string[]
): {
  videoElements: Record<string, unknown>[]
  durationSec: number
} {
  const voDur = Number(input.voDurationSec.toFixed(3))
  const t0 = Number((input.timelineStartSec ?? 0).toFixed(3))
  const videoElements: Record<string, unknown>[] = []

  videoElements.push({
    id: 'vo_intro_bg_black',
    type: 'shape',
    path: 'M 0% 0% L 100% 0% L 100% 100% L 0% 100% Z',
    width: '100%',
    height: '100%',
    fill_color: '#000000',
    stroke_width: '0vmin',
    track: TRACK_VO_BLACK,
    time: t0,
    duration: voDur,
    x: '50%',
    y: '50%',
    x_alignment: '50%',
    y_alignment: '50%',
  })

  const tiles =
    input.voBrollTiles && input.voBrollTiles.length > 0
      ? input.voBrollTiles
      : planVoiceOverBrollTiles(
          voDur,
          input.brollClipIndicesInFileOrder,
          input.clipFileDurationsSec,
          clipUrls
        )
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    const url = clipUrls[tile.clipIndex]
    if (!url) continue
    videoElements.push(
      withOptionalCutPunchAnimations(
        {
          id: `vo_intro_broll_${i}`,
          name: `VO_intro_BROLL_${tile.clipIndex}`,
          type: 'video',
          track: TRACK_VO_BROLL,
          time: Number((t0 + tile.timeStart).toFixed(3)),
          duration: tile.duration,
          source: url,
          trim_start: tile.trimStart,
          trim_duration: tile.duration,
          volume: '0%',
          fit: 'cover',
          clip: true,
          width: '100%',
          height: '100%',
        },
        i,
        i > 0
      )
    )
  }

  const voiceId = 'vo_intro_voice_audio'
  const voiceUrl = clipUrls[input.voClipIndex] ?? clipUrls[0]
  videoElements.push({
    id: voiceId,
    name: 'VO_intro_voice',
    type: 'audio',
    track: TRACK_VOICE_AUDIO,
    time: t0,
    duration: voDur,
    source: voiceUrl,
    trim_start: 0,
    trim_duration: voDur,
    volume: '100%',
  })

  return { videoElements, durationSec: voDur }
}

function buildVideoSequenceLayers(
  sequence: SequenceItem[],
  clipUrls: string[],
  layerOpts?: {
    timeOffsetSec?: number
    includeFadeInFirstSegment?: boolean
    /** Evita ids duplicados al concatenar varios tramos (p. ej. pre_/post_). */
    elementIdPrefix?: string
  }
): {
  videoElements: Record<string, unknown>[]
  totalDuration: number
  transitionTimes: number[]
} {
  const timeOffsetSec = layerOpts?.timeOffsetSec ?? 0
  const includeFadeInFirst = layerOpts?.includeFadeInFirstSegment ?? false
  const idPre = layerOpts?.elementIdPrefix ?? ''

  const videoElements: Record<string, unknown>[] = []
  const transitionTimes: number[] = []
  let timeAccumulator = 0

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]
    const duration = Number(item.trim_duration.toFixed(3))
    const timeStart = Number((timeAccumulator + timeOffsetSec).toFixed(3))
    const includeFadeIn = i > 0 || (i === 0 && includeFadeInFirst)
    if (includeFadeIn) transitionTimes.push(timeStart)

    const ov = item.visual_overlay

    if (ov && clipUrls[ov.clip_index]) {
      const brollUrl = clipUrls[ov.clip_index]!
      const voiceUrl = clipUrls[item.clip_index] ?? clipUrls[0]
      const brollId = `${idPre}video_${i}_broll`
      const voiceId = `${idPre}audio_${i}_voice`

      videoElements.push(
        withOptionalCutPunchAnimations(
          {
            id: brollId,
            name: `Seg_${item.segment_id}_broll`,
            type: 'video',
            track: TRACK_VIDEO_BASE,
            time: timeStart,
            duration,
            source: brollUrl,
            trim_start: Number(ov.trim_start.toFixed(3)),
            volume: '0%',
            fit: 'cover',
            clip: true,
            width: '100%',
            height: '100%',
          },
          i,
          includeFadeIn
        )
      )

      videoElements.push({
        id: voiceId,
        name: `Seg_${item.segment_id}_voice`,
        type: 'audio',
        track: TRACK_VOICE_AUDIO,
        time: timeStart,
        duration,
        source: voiceUrl,
        trim_start: Number(item.trim_start.toFixed(3)),
        trim_duration: duration,
        volume: '100%',
      })

    } else {
      const clipUrl = clipUrls[item.clip_index] ?? clipUrls[0]
      const videoId = `${idPre}video_${i}`
      videoElements.push(
        withOptionalCutPunchAnimations(
          {
            id: videoId,
            name: `Seg_${item.segment_id}`,
            type: 'video',
            track: TRACK_VIDEO_BASE,
            time: timeStart,
            duration,
            source: clipUrl,
            trim_start: Number(item.trim_start.toFixed(3)),
            fit: 'cover',
            clip: true,
            width: '100%',
            height: '100%',
          },
          i,
          includeFadeIn
        )
      )

    }

    timeAccumulator += duration
  }

  return {
    videoElements,
    totalDuration: Number((timeAccumulator + timeOffsetSec).toFixed(3)),
    transitionTimes,
  }
}

// ─── SFX ─────────────────────────────────────────────────────────────────────

function buildTransitionSfxElements(transitionTimes: number[]): Record<string, unknown>[] {
  if (!SFX_WHOOSH_URL) return []

  return transitionTimes.map((time, i) => ({
    id: `sfx_whoosh_${i}`,
    type: 'audio',
    track: TRACK_TRANSITION_SFX,
    time: Math.max(0, time - 0.02),
    duration: Math.max(0.15, CUT_PUNCH_DURATION_SEC + 0.08),
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
    track: TRACK_SUBTITLE_SFX,
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
    track: TRACK_MUSIC,
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
  musicUrl: string,
  voiceOverIntro?: VoiceOverIntroRenderInput | null
): Promise<string> {
  const webhookUrl = getWebhookUrl()

  let videoElements: Record<string, unknown>[] = []
  let transitionTimes: number[] = []
  let totalDuration = 0

  if (voiceOverIntro != null) {
    const ins = Math.max(
      0,
      Math.min(voiceOverIntro.insertAfterSegmentCount, sequence.length)
    )
    const beforeSeq = sequence.slice(0, ins)
    const afterSeq = sequence.slice(ins)
    const dBefore = sumSequenceItemsDurationSec(beforeSeq)
    const voDur = voiceOverIntro.voDurationSec
    const voInput: VoiceOverIntroRenderInput = {
      ...voiceOverIntro,
      timelineStartSec: dBefore,
    }
    const introLayers = buildVoiceOverIntroLayers(voInput, clipUrls)

    const layersBefore = buildVideoSequenceLayers(beforeSeq, clipUrls, {
      timeOffsetSec: 0,
      includeFadeInFirstSegment: beforeSeq.length > 0,
      elementIdPrefix: 'pre_',
    })
    const layersAfter = buildVideoSequenceLayers(afterSeq, clipUrls, {
      timeOffsetSec: dBefore + voDur,
      includeFadeInFirstSegment: afterSeq.length > 0,
      elementIdPrefix: 'post_',
    })

    videoElements = [
      ...layersBefore.videoElements,
      ...introLayers.videoElements,
      ...layersAfter.videoElements,
    ]
    transitionTimes = [...layersBefore.transitionTimes, ...layersAfter.transitionTimes]
    totalDuration = layersAfter.totalDuration

    console.log(
      `[VideoV2Pipeline][${jobId}][Creatomate] Render → ${sequence.length} segmentos + VO manual ` +
        `(${voDur.toFixed(1)}s en t=${dBefore.toFixed(2)}s, tras ${ins} cortes) (subtítulos AssemblyAI + animaciones)`
    )
  } else {
    const mainLayers = buildVideoSequenceLayers(sequence, clipUrls, {
      timeOffsetSec: 0,
      includeFadeInFirstSegment: sequence.length > 0,
    })
    videoElements = mainLayers.videoElements
    transitionTimes = mainLayers.transitionTimes
    totalDuration = mainLayers.totalDuration
    console.log(
      `[VideoV2Pipeline][${jobId}][Creatomate] Render → ${sequence.length} segmentos (subtítulos AssemblyAI + animaciones)`
    )
  }

  const transitionSfx = buildTransitionSfxElements(transitionTimes)
  const subtitleSfx = buildSubtitleSfxElements(subtitleBlocks, totalDuration)
  const captionElements = buildManualCaptionElements(subtitleBlocks, totalDuration)
  const musicElement = buildMusicElement(musicUrl, totalDuration)

  const allElements = [
    ...videoElements,
    ...transitionSfx,
    ...subtitleSfx,
    ...captionElements,
    musicElement,
  ]

  const body = buildCreatomateRenderRequestBody(webhookUrl, jobId, {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    duration: totalDuration,
    elements: allElements,
  })

  const sfxInfo = transitionSfx.length > 0 || subtitleSfx.length > 0
    ? `, ${transitionSfx.length} whoosh SFX, ${subtitleSfx.length} pop SFX`
    : ', SFX deshabilitados (sin URLs configuradas)'

  console.log(
    `[VideoV2Pipeline][${jobId}][Creatomate] API=${CREATOMATE_API_VER}, 1080x1920, totalDuration=${totalDuration}s, ` +
      `${videoElements.length} clips, ${captionElements.length} subtítulos (texto AssemblyAI)${sfxInfo}, webhook_url=${webhookUrl}`
  )

  const result = await postRender(body)
  console.log(`[VideoV2Pipeline][${jobId}][Creatomate] Render iniciado. ID=${result.id} status=${result.status}`)
  return result.id
}
