/**
 * Creatomate V2 — Render de alta calidad para Reels/TikTok (9:16).
 *
 * - Video: entre cortes, solo un “golpe” de zoom in/out muy breve al inicio del clip (estilo CapCut), sin transiciones nativas Creatomate ni zoom lineal en toda la toma.
 * - visual_overlay: B-roll (mute) debajo y pista de audio separada para la voz.
 * - Opcional: bloque VO manual (audio completo + B-roll Assembly mute + negro); la posición en la timeline la elige Gemini (insertAfterSegmentCount).
 * - Subtítulos: texto explícito desde AssemblyAI (`subtitleBlocks`), capa alta para verse sobre B-roll VO;
 *   estilo “retención” (paleta rojo / amarillo / blanco, posición y animaciones variables por ítem; mismos timestamps).
 *   `subtitleBlocks` también alimenta SFX pop.
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

/** Cuerpo plano del render (mismo JSON que acepta `Preview.setSource` y el POST /v2/renders sin `template_id`). */
export type CreatomateFlatRenderScript = {
  output_format: string
  width: number
  height: number
  duration: number
  elements: unknown[]
}

function buildCreatomateRenderRequestBody(
  webhookUrl: string,
  metadata: string,
  renderScript: CreatomateFlatRenderScript
): Record<string, unknown> {
  return {
    webhook_url: webhookUrl,
    metadata,
    ...renderScript,
  }
}

/**
 * Construye el RenderScript que enviamos a Creatomate (y que el Preview SDK puede cargar con `setSource`).
 */
export function buildCreatomateRenderScript(
  jobId: string,
  sequence: SequenceItem[],
  clipUrls: string[],
  subtitleBlocks: SubtitleBlock[],
  musicUrl: string,
  voiceOverIntro?: VoiceOverIntroRenderInput | null
): CreatomateFlatRenderScript {
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

  const sfxInfo = transitionSfx.length > 0 || subtitleSfx.length > 0
    ? `, ${transitionSfx.length} whoosh SFX, ${subtitleSfx.length} pop SFX`
    : ', SFX deshabilitados (sin URLs configuradas)'

  console.log(
    `[VideoV2Pipeline][${jobId}][Creatomate] API=${CREATOMATE_API_VER}, 1080x1920, totalDuration=${totalDuration}s, ` +
      `${videoElements.length} clips, ${captionElements.length} subtítulos (texto AssemblyAI)${sfxInfo}`
  )

  return {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    duration: totalDuration,
    elements: allElements,
  }
}

/** Inicia un render en la nube con el mismo JSON que muestra el Preview SDK (tras edición manual). */
export async function submitCreatomateRenderForJob(
  jobId: string,
  script: CreatomateFlatRenderScript
): Promise<string> {
  const webhookUrl = getWebhookUrl()
  const body = buildCreatomateRenderRequestBody(webhookUrl, jobId, script)
  console.log(
    `[VideoV2Creatomate] POST render job=${jobId} webhook_url=${webhookUrl} elements=${Array.isArray(script.elements) ? script.elements.length : 0}`
  )
  const result = await postRender(body)
  return result.id
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
// B-roll + voz en off: plano de vídeo (B-roll o único clip) + pista `audio` separada para la voz.

/**
 * Tracks (Creatomate: 1–1000). Importante: no reutilizar el mismo track para vídeo B-roll VO y
 * otros elementos que compartan tiempo en el Reel (p. ej. SFX), o el motor puede truncar capas.
 */
/** Fondo negro del bloque VO: track propio, separado del video base para evitar composición no determinista. */
const TRACK_VO_BLACK = 2
const TRACK_VIDEO_BASE = 1
const TRACK_TRANSITION_SFX = 4
/** Antes 5: chocaba con TRACK_VO_BROLL y los planos del bloque VO se cortaban a ~0,35s (pops). */
const TRACK_SUBTITLE_SFX = 7
const TRACK_VO_BROLL = 5
const TRACK_MUSIC = 6
const TRACK_VOICE_AUDIO = 14
/** Por encima del B-roll del VO (5) y del vídeo base; texto AssemblyAI, no re-transcripción Creatomate. */
const TRACK_MANUAL_CAPTIONS = 18

/** Paleta subtítulos estilo hook / retención (solo apariencia; timings sin cambios). */
const CAPTION_FILL_PRIMARY = '#E81C2A'
const CAPTION_FILL_SECONDARY_YELLOW = '#FFE94A'
const CAPTION_FILL_SECONDARY_WHITE = '#FFFFFF'

/** Duración máxima de la animación de entrada respecto al tiempo visible del subtítulo. */
const CAPTION_ENTRANCE_MAX_FRAC = 0.48
const CAPTION_ENTRANCE_MIN_SEC = 0.12
const CAPTION_ENTRANCE_MAX_SEC = 0.32

/** Mix maestro: música un poco más baja, voz / vídeo un poco más altos. */
const REEL_MUSIC_VOLUME = '27%'
const REEL_DIALOGUE_VOLUME = '108%'

/**
 * Valores por defecto explícitos en capas `video` para evitar filtros o modos de fusión heredados
 * que puedan alterar color al componer varias pistas (ver documentación: blend_mode, color_filter).
 */
function creatomateVideoElementBase(): Record<string, unknown> {
  return {
    blend_mode: 'none',
    color_filter: 'none',
    color_filter_value: '0%',
    opacity: '100%',
  }
}

/** Índice reservado: la VO no sale de ningún clip de vídeo (audio externo MP3/WAV). */
export const VOICE_OVER_EXTERNAL_CLIP_INDEX = -1

/** Bloque VO manual: audio completo + B-roll mute + negro; `timelineStartSec` = posición en el Reel. */
export interface VoiceOverIntroRenderInput {
  /** Con `VOICE_OVER_EXTERNAL_CLIP_INDEX`, el audio sale de `externalVoiceAudioUrl` / `voiceOverAudioPath`. */
  voClipIndex: number
  voDurationSec: number
  /** Índices de clips para capas sobre la VO (`visual_only` automático, o lista manual en orden de timeline). */
  brollClipIndicesInFileOrder: number[]
  /** Duración de cada archivo (misma longitud que clipUrls). */
  clipFileDurationsSec: (number | null)[]
  /** Cuántos segmentos narrativos van antes de este bloque (lo decide Gemini). */
  insertAfterSegmentCount: number
  /** Opcional; en render se recalcula desde `sequence` + `insertAfterSegmentCount`. */
  timelineStartSec?: number
  /** Si existe, sustituye el emplanado lineal por ventanas alineadas a la VO (semántica). */
  voBrollTiles?: VoBrollTile[]
  /** URL firmada del archivo de audio de VO (Creatomate `type: audio`). */
  externalVoiceAudioUrl?: string
  /**
   * Ruta en Storage del audio VO; el pipeline refresca `externalVoiceAudioUrl` antes de cada render.
   */
  voiceOverAudioPath?: string
  /** Recorte inicial del archivo VO externo para saltar silencio al inicio. */
  externalVoiceTrimStartSec?: number
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

function captionEntranceBudgetSec(visibleDurationSec: number): number {
  const raw = visibleDurationSec * CAPTION_ENTRANCE_MAX_FRAC
  return Number(
    Math.min(CAPTION_ENTRANCE_MAX_SEC, Math.max(CAPTION_ENTRANCE_MIN_SEC, raw)).toFixed(3)
  )
}

/** Colores de acento sin tocar `time` / `duration` del subtítulo. */
function pickCaptionFillColor(idx: number, upperText: string): string {
  const len = upperText.length
  const h = (idx * 17 + len * 5) % 100
  if (h < 38) return CAPTION_FILL_PRIMARY
  if (h < 72) return CAPTION_FILL_SECONDARY_YELLOW
  return CAPTION_FILL_SECONDARY_WHITE
}

function pickCaptionStrokeAndShadow(fill: string): {
  stroke_color: string
  stroke_width: string
  shadow_color: string
  shadow_blur: string
} {
  if (fill === CAPTION_FILL_SECONDARY_YELLOW) {
    return {
      stroke_color: '#0d0d0d',
      stroke_width: '2.15 vmin',
      shadow_color: 'rgba(0,0,0,0.88)',
      shadow_blur: '1.05 vmin',
    }
  }
  if (fill === CAPTION_FILL_PRIMARY) {
    return {
      stroke_color: '#1a0204',
      stroke_width: '1.9 vmin',
      shadow_color: 'rgba(0,0,0,0.82)',
      shadow_blur: '0.95 vmin',
    }
  }
  return {
    stroke_color: '#000000',
    stroke_width: '1.95 vmin',
    shadow_color: 'rgba(0,0,0,0.9)',
    shadow_blur: '1.1 vmin',
  }
}

/** Zonas seguras tipo Reels: arriba (gancho), centro, tercio inferior — ciclo determinista. */
function pickCaptionVerticalPosition(idx: number): string {
  const yPositions = ['22%', '34%', '48%', '62%', '74%']
  return yPositions[idx % yPositions.length]!
}

function pickCaptionBackground(idx: number, fill: string): {
  background_color: string
  background_x_padding: string
  background_y_padding: string
  background_border_radius: string
} {
  const stickerOnly = idx % 4 === 0
  if (stickerOnly) {
    return {
      background_color: 'rgba(0,0,0,0)',
      background_x_padding: '28%',
      background_y_padding: '12%',
      background_border_radius: '18%',
    }
  }
  const pillDark = idx % 3 === 1
  if (pillDark) {
    return {
      background_color: 'rgba(0,0,0,0.48)',
      background_x_padding: '34%',
      background_y_padding: '16%',
      background_border_radius: '24%',
    }
  }
  const tint =
    fill === CAPTION_FILL_PRIMARY
      ? 'rgba(232,28,42,0.14)'
      : fill === CAPTION_FILL_SECONDARY_YELLOW
        ? 'rgba(255,233,74,0.12)'
        : 'rgba(255,255,255,0.1)'
  return {
    background_color: tint,
    background_x_padding: '32%',
    background_y_padding: '15%',
    background_border_radius: '22%',
  }
}

/**
 * Entradas variadas (solo animación; no altera cuándo empieza el elemento en la línea de tiempo).
 * Usa solo `fade` / `scale` como en el resto del archivo, compatibles con la API v2.
 */
function buildDynamicCaptionEntrances(idx: number, visibleDurationSec: number): Record<string, unknown>[] {
  const budget = captionEntranceBudgetSec(visibleDurationSec)
  const fadeQuick: Record<string, unknown> = {
    time: 0,
    duration: Number(Math.min(0.12, budget * 0.35).toFixed(3)),
    type: 'fade',
    easing: 'cubic-out',
    fade: false,
  }

  const mode = idx % 5
  const scale = (
    start: string,
    end: string,
    dur: number,
    t = 0,
    easing = 'cubic-out'
  ): Record<string, unknown> => ({
    time: Number(t.toFixed(3)),
    duration: Number(dur.toFixed(3)),
    type: 'scale',
    easing,
    scope: 'element',
    start_scale: start,
    end_scale: end,
    fade: false,
  })

  switch (mode) {
    case 0: {
      const d1 = budget * 0.48
      const d2 = budget - d1
      return [fadeQuick, scale('56%', '122%', d1), scale('122%', '100%', d2, d1)]
    }
    case 1:
      return [fadeQuick, scale('138%', '100%', budget)]
    case 2:
      return [fadeQuick, scale('74%', '100%', budget)]
    case 3: {
      const d1 = budget * 0.42
      const d2 = budget - d1
      return [fadeQuick, scale('92%', '108%', d1), scale('108%', '100%', d2, d1)]
    }
    default:
      return [fadeQuick, scale('68%', '100%', budget)]
  }
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
    const fill = pickCaptionFillColor(idx, upper)
    const strokeShadow = pickCaptionStrokeAndShadow(fill)
    const bg = pickCaptionBackground(idx, fill)
    const visible = Math.max(0.15, entry.duration)
    return {
      id: `cap_${idx}`,
      type: 'text',
      track: TRACK_MANUAL_CAPTIONS,
      time: Number(entry.time.toFixed(3)),
      duration: Number(visible.toFixed(3)),
      text: upper,
      fill_color: fill,
      stroke_color: strokeShadow.stroke_color,
      stroke_width: strokeShadow.stroke_width,
      shadow_color: strokeShadow.shadow_color,
      shadow_blur: strokeShadow.shadow_blur,
      font_family: 'Montserrat',
      font_weight: 800,
      font_size: short ? '9.6 vmin' : '7.85 vmin',
      line_height: '118%',
      letter_spacing: short ? '2.2%' : '1.2%',
      text_transform: 'uppercase',
      y: pickCaptionVerticalPosition(idx),
      width: '94%',
      height: '30%',
      x_alignment: '50%',
      y_alignment: '50%',
      background_color: bg.background_color,
      background_x_padding: bg.background_x_padding,
      background_y_padding: bg.background_y_padding,
      background_border_radius: bg.background_border_radius,
      animations: buildDynamicCaptionEntrances(idx, visible),
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
  const validIndices = brollIndices.filter((idx) => Number.isInteger(idx) && idx >= 0 && !!clipUrls[idx])
  if (validIndices.length === 0) return tiles
  let t = 0
  let i = 0
  let safety = 0
  // Repetir overlays en ciclo hasta cubrir todo el bloque VO (evita huecos negros al agotar lista).
  while (t < voDurationSec - 0.04 && safety < 400) {
    const idx = validIndices[i % validIndices.length]!
    i++
    safety++
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

  const tiles =
    input.voBrollTiles && input.voBrollTiles.length > 0
      ? input.voBrollTiles
      : planVoiceOverBrollTiles(
          voDur,
          input.brollClipIndicesInFileOrder,
          input.clipFileDurationsSec,
          clipUrls
        )

  const skipClipIdx = input.voClipIndex
  const normalizedTiles = tiles
    .filter((t) => skipClipIdx < 0 || t.clipIndex !== skipClipIdx)
    .filter((t) => Number.isFinite(t.timeStart) && Number.isFinite(t.duration))
    .filter((t) => t.duration >= 0.08)
    .filter((t) => t.timeStart < voDur - 0.04)

  const resolvedTiles =
    normalizedTiles.length > 0
      ? normalizedTiles
      : planVoiceOverBrollTiles(
          voDur,
          skipClipIdx < 0
            ? input.brollClipIndicesInFileOrder
            : input.brollClipIndicesInFileOrder.filter((idx) => idx !== skipClipIdx),
          input.clipFileDurationsSec,
          clipUrls
        )

  let brollVideoCount = 0
  for (let i = 0; i < resolvedTiles.length; i++) {
    const tile = resolvedTiles[i]
    const url = clipUrls[tile.clipIndex]
    if (!url) continue
    brollVideoCount++
    videoElements.push(
      withOptionalCutPunchAnimations(
        {
          ...creatomateVideoElementBase(),
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

  // Sin capa negra cuando hay B-roll visible (evita que una forma tape el vídeo en algunos motores).
  if (brollVideoCount === 0) {
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
  }

  const voiceId = 'vo_intro_voice_audio'
  const voiceUrl =
    input.externalVoiceAudioUrl ??
    (input.voClipIndex >= 0 ? clipUrls[input.voClipIndex] : undefined) ??
    clipUrls[0]
  if (!voiceUrl) {
    throw new Error('[Creatomate] Bloque VO: falta URL de audio (externalVoiceAudioUrl o clip).')
  }
  videoElements.push({
    id: voiceId,
    name: 'VO_intro_voice',
    type: 'audio',
    track: TRACK_VOICE_AUDIO,
    time: t0,
    duration: voDur,
    source: voiceUrl,
    trim_start: Number((input.externalVoiceTrimStartSec ?? 0).toFixed(3)),
    trim_duration: voDur,
    volume: REEL_DIALOGUE_VOLUME,
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
            ...creatomateVideoElementBase(),
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
        volume: REEL_DIALOGUE_VOLUME,
      })

    } else {
      const clipUrl = clipUrls[item.clip_index] ?? clipUrls[0]
      const videoId = `${idPre}video_${i}`
      videoElements.push(
        withOptionalCutPunchAnimations(
          {
            ...creatomateVideoElementBase(),
            id: videoId,
            name: `Seg_${item.segment_id}`,
            type: 'video',
            track: TRACK_VIDEO_BASE,
            time: timeStart,
            duration,
            source: clipUrl,
            trim_start: Number(item.trim_start.toFixed(3)),
            volume: REEL_DIALOGUE_VOLUME,
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
    volume: REEL_MUSIC_VOLUME,
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
  const script = buildCreatomateRenderScript(
    jobId,
    sequence,
    clipUrls,
    subtitleBlocks,
    musicUrl,
    voiceOverIntro
  )
  const renderId = await submitCreatomateRenderForJob(jobId, script)
  console.log(`[VideoV2Pipeline][${jobId}][Creatomate] Render iniciado. ID=${renderId}`)
  return renderId
}
