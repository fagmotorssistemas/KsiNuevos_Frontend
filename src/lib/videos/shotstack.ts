/**
 * Shotstack — motor de render (reemplazo de Creatomate en pipeline).
 *
 * Misma firma pública de `renderSegmentsV2` que creatomate.ts para pipeline.ts.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { SequenceItem, SubtitleBlock } from './segmenter'
import type { BrandConfig, VoiceOverIntroRenderInput } from './creatomate'
import { getSignedUrlForPath } from './storage'
import { isDriveBadgeText } from './drive-badge'

const RAW_BUCKET = 'raw-videos-v2'

/** Salida vertical 1080p (9:16). */
const OUTPUT_WIDTH = 1080
const OUTPUT_HEIGHT = 1920
/** Canvas base (720p) donde se calibraron px de overlays y tipografía. */
const DESIGN_WIDTH = 720
const LAYOUT_SCALE = OUTPUT_WIDTH / DESIGN_WIDTH

/** Convierte px definidos en 720p al canvas actual (1080p, factor 1.5×). */
function s720(px: number): number {
  return Math.round(px * LAYOUT_SCALE)
}

const MONTSERRAT_BLACK_TTF =
  'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@5.2.5/latin-900-normal.ttf'

const CLOSING_LOGO_LEN_SEC = 3.5
const DEFAULT_CLOSING_LOGO_PATH = '/logol.png'
const WHATSAPP_CTA_WIDTH_PX = s720(450)
const WHATSAPP_CTA_HEIGHT_PX = s720(210)
/** Más alto que el logo de cierre (y≈0.08 + 100px) para no taparlo */
/** Más alto que el logo de cierre (y≈0.08 + 100px) para no taparlo */
const WHATSAPP_CTA_OFFSET_Y = 0.10
const DEFAULT_WHATSAPP_CTA_URL =
  'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/iconos-videos-edicion/10CA864A-21FC-4375-ADA6-3ED381695675(1).png'
const DEFAULT_MOTOR_MENTION_SFX_URL =
  'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/music-tracks-v3/mixkit-correct-answer-tone-2870.wav'
const DEFAULT_CLIP_TRANSITION_WHOOSH_URL =
  'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/music-tracks-v3/dragon-studio-whoosh-effect-382717.mp3'
/** Volumen equilibrado vs música (0.17) y diálogo del clip (1.0) */
const MOTOR_MENTION_SFX_VOLUME = 0.4
const MOTOR_MENTION_SFX_LENGTH_SEC = 0.45
const MOTOR_MENTION_SFX_MIN_GAP_SEC = 0.25
/** 2º y 4º clip (índices 1 y 3): whoosh al entrar */
const CLIP_WHOOSH_AT_CLIP_INDICES = [1, 3] as const
const CLIP_TRANSITION_WHOOSH_VOLUME = 0.4
const CLIP_TRANSITION_WHOOSH_LENGTH_SEC = 0.55
const CLIP_TRANSITION_WHOOSH_LEAD_SEC = 0.02
const DEFAULT_BRAND_TITLE_POP_SFX_URL =
  'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/music-tracks-v3/dragon-studio-pop-402324.mp3'
const BRAND_TITLE_POP_SFX_VOLUME = 0.4
const BRAND_TITLE_POP_SFX_LENGTH_SEC = 0.35
const DEFAULT_TRANSMISSION_GEAR_SFX_URL =
  'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/music-tracks-v3/universfield-new-notification-040-493469.mp3'
const TRANSMISSION_GEAR_SFX_VOLUME = 0.4
const TRANSMISSION_GEAR_SFX_LENGTH_SEC = 0.45
const COMENTA_TEXT_WIDTH_PX = s720(700)
const COMENTA_LINE_HEIGHT_PX = s720(200)
const COMENTA_LINE1_OFFSET_Y = -0.08
const COMENTA_LINE2_OFFSET_Y = -0.13
const COMENTA_FONT_FAMILY = 'Montserrat'

/** Subtítulos y COMENTA: escala calibrada en 720p, aplicada a 1080p. */
function overlayCaptionFontSize(text: string): number {
  const len = text.length
  if (len <= 8) return s720(80)
  if (len <= 14) return s720(72)
  if (len <= 20) return s720(60)
  return s720(48)
}

function comentaCaptionFontSize(text: string): number {
  return overlayCaptionFontSize(text)
}

function longPairFontSize(word: string): number {
  const len = word.length
  if (len <= 6) return s720(88)
  if (len <= 9) return s720(78)
  if (len <= 12) return s720(68)
  return s720(58)
}

function brandL2FontSize(wordCount: number): number {
  if (wordCount <= 1) return s720(96)
  if (wordCount === 2) return s720(80)
  return s720(64)
}

/** Máx. caracteres en L2 con 2 palabras de modelo; si excede, 2.ª palabra pasa a L3. */
const BRAND_L2_TWO_WORD_MAX_CHARS = 14

const COMENTA_ENTRANCE_SLIDE_SEC = 0.28
const PLAYFAIR_DISPLAY_SEMIBOLD_TTF =
  'https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@5.2.5/latin-600-normal.ttf'
const CLOSING_LOGO_WIDTH_PX = s720(400)
const CLOSING_LOGO_HEIGHT_PX = s720(100)
const CLOSING_LOGO_ENTRANCE_SEC = 0.45

/** Solapamiento por transición (*Fast ≈ 0.5 s) para evitar flash negro */
const CLIP_TRANSITION_OVERLAP_SEC = 0.5
/** boundary index → transition.out del clip que sale (el entrante no lleva in) */
const CLIP_BOUNDARY_TRANSITIONS: Record<number, string> = {
  0: 'slideUp', // clip 1→2: lento, un poco más notorio que slideUpFast
  1: 'wipeRightFast',
  4: 'fadeFast', // clip 5→6: suelta la capa superior mientras el 6 entra con wipeLeft abajo
}
/** 6º clip (índice 5): wipeLeft sobre underlay del clip 5 (evita negro del timeline) */
const CLIP_6_AT_INDEX = 5
const CLIP_6_ENTER_TRANSITION_IN = 'wipeLeft'
const CLIP_6_WIPE_UNDERLAY_SEC = 1.0
/** Intro clip 1: zoomOut (empieza cerca, se aleja) — igual que Creatomate índice par */
const FIRST_CLIP_INTRO_EFFECT = 'zoomOutFast' as const
const FIRST_CLIP_INTRO_PULL_SEC = 0.28

/** Destello amarillo-naranja al entrar el 4º clip (índice 3) */
const CLIP_FLASH_AT_CLIP_INDEX = 3
const CLIP_FLASH_LENGTH_SEC = 0.55

const CLIP_FLASH_LEAD_SEC = 0.15
const CLIP_FLASH_FADE_IN_SEC = 0.12
const CLIP_FLASH_HOLD_SEC = 0.08
const CLIP_FLASH_FADE_OUT_SEC = 0.35
const CLIP_FLASH_PEAK_OPACITY = 0.65
// URL del SVG del destello subido a Supabase Storage (iconos-videos-edicion/flash-destello.svg).
// Ejecutar src/scripts/upload-flash-svg.ts una vez para generarla y añadirla al .env.
const CLIP_FLASH_SVG_URL = process.env.FLASH_SVG_URL ?? ''

function buildTimelineFonts(): { src: string }[] {
  return [{ src: MONTSERRAT_BLACK_TTF }, { src: PLAYFAIR_DISPLAY_SEMIBOLD_TTF }]
}

function assertShotstackEnv(): { apiKey: string; baseUrl: string; callbackBase: string } {
  const apiKey = process.env.SHOTSTACK_API_KEY?.trim()
  const baseUrl = process.env.SHOTSTACK_BASE_URL?.trim()
  const callbackBase = process.env.APP_PUBLIC_URL?.trim()
  if (!apiKey) throw new Error('[Shotstack] Falta SHOTSTACK_API_KEY en el entorno del servidor.')
  if (!baseUrl) throw new Error('[Shotstack] Falta SHOTSTACK_BASE_URL en el entorno del servidor.')
  if (!callbackBase) throw new Error('[Shotstack] Falta APP_PUBLIC_URL en el entorno del servidor.')
  return { apiKey, baseUrl, callbackBase: callbackBase.endsWith('/') ? callbackBase.slice(0, -1) : callbackBase }
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0')
}

function pad3(n: number): string {
  return String(Math.floor(n)).padStart(3, '0')
}

function formatVttTimestamp(secFloat: number): string {
  const s = Math.max(0, secFloat)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(ms)}`
}

export function buildVttContent(blocks: SubtitleBlock[]): string {
  const clean = blocks
    .filter((b) => b && typeof b.time === 'number' && typeof b.duration === 'number')
    .filter((b) => b.duration > 0.01 && b.text?.trim())
    .sort((a, b) => a.time - b.time)

  const lines: string[] = ['WEBVTT', '']
  for (let i = 0; i < clean.length; i++) {
    const b = clean[i]!
    const start = Number(b.time.toFixed(3))
    const end = Number(Math.max(start + 0.05, start + b.duration).toFixed(3))
    lines.push(String(i + 1))
    lines.push(`${formatVttTimestamp(start)} --> ${formatVttTimestamp(end)}`)
    lines.push(String(b.text).trim().toUpperCase())
    lines.push('')
  }
  return lines.join('\n')
}

export async function uploadVttToStorage(jobId: string, vttContent: string): Promise<string> {
  const supabase = getServiceClient()
  const path = `subtitles/${jobId}.vtt`
  const body = Buffer.from(vttContent, 'utf8')

  const { error } = await supabase.storage.from(RAW_BUCKET).upload(path, body, {
    contentType: 'text/vtt',
    upsert: true,
    cacheControl: '3600',
  })
  if (error) {
    throw new Error(`[Shotstack] Error subiendo VTT a Storage (${path}): ${error.message}`)
  }

  return getSignedUrlForPath(path)
}

type ShotstackClip = Record<string, unknown>
type ShotstackTrack = { clips: ShotstackClip[] }

function computeLinearStarts(sequence: SequenceItem[]): number[] {
  const starts: number[] = []
  let t = 0
  for (const item of sequence) {
    starts.push(Number(t.toFixed(3)))
    t += Number(item.trim_duration.toFixed(3))
  }
  return starts
}

function buildFirstClipIntroClips(
  item: SequenceItem,
  src: string,
  withSlideOut: boolean
): ShotstackClip[] {
  const trimStart = Number(item.trim_start.toFixed(3))
  const totalLen = Number(item.trim_duration.toFixed(3))
  const introDur = Number(FIRST_CLIP_INTRO_PULL_SEC.toFixed(3))

  const mk = (
    timelineStart: number,
    playLength: number,
    sourceOffset: number,
    extra: Partial<ShotstackClip> = {}
  ): ShotstackClip => ({
    asset: {
      type: 'video',
      src,
      trim: Number((trimStart + sourceOffset).toFixed(3)),
      volume: 1,
      transcode: true,
    },
    start: Number(timelineStart.toFixed(3)),
    length: Number(Math.max(0.05, playLength).toFixed(3)),
    fit: 'cover',
    ...extra,
  })

  const clips: ShotstackClip[] = [
    mk(0, introDur, 0, { effect: FIRST_CLIP_INTRO_EFFECT }),
  ]

  const remain = Number((totalLen - introDur).toFixed(3))
  if (remain >= 0.12) {
    clips.push(mk(introDur, remain, introDur))
  }

  if (withSlideOut) {
    const last = clips[clips.length - 1]!
    last.transition = { out: CLIP_BOUNDARY_TRANSITIONS[0]! }
  }

  return clips
}

function countActiveClipTransitions(sequenceLength: number): number {
  let n = 0
  for (const boundary of Object.keys(CLIP_BOUNDARY_TRANSITIONS).map(Number)) {
    if (boundary + 1 < sequenceLength) n++
  }
  return n
}

function countOverlapsBeforeClip(clipIndex: number, sequenceLength: number): number {
  let n = 0
  for (const boundary of Object.keys(CLIP_BOUNDARY_TRANSITIONS).map(Number)) {
    if (clipIndex > boundary && boundary + 1 < sequenceLength) n++
  }
  return n
}

function computeClipVideoStartSec(sequence: SequenceItem[], clipIndex: number): number {
  const linearStarts = computeLinearStarts(sequence)
  return Number(
    (
      linearStarts[clipIndex]! -
      CLIP_TRANSITION_OVERLAP_SEC * countOverlapsBeforeClip(clipIndex, sequence.length)
    ).toFixed(3)
  )
}

function buildClipFlashTransitionTrack(
  sequence: SequenceItem[],
  clipIndex: number,
  jobId?: string,
  opts?: {
    label?: string
    leadSec?: number
    lengthSec?: number
    fadeInSec?: number
    holdSec?: number
    fadeOutSec?: number
    peakOpacity?: number
  }
): ShotstackTrack | null {
  if (sequence.length <= clipIndex) return null

  const cutSec = computeClipVideoStartSec(sequence, clipIndex)
  const leadSec = opts?.leadSec ?? CLIP_FLASH_LEAD_SEC
  const lengthSec = opts?.lengthSec ?? CLIP_FLASH_LENGTH_SEC
  const fadeInSec = opts?.fadeInSec ?? CLIP_FLASH_FADE_IN_SEC
  const holdSec = opts?.holdSec ?? CLIP_FLASH_HOLD_SEC
  const fadeOutSec = opts?.fadeOutSec ?? CLIP_FLASH_FADE_OUT_SEC
  const peakOpacity = opts?.peakOpacity ?? CLIP_FLASH_PEAK_OPACITY
  const start = Number(Math.max(0, cutSec - leadSec).toFixed(3))

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] Flash ${opts?.label ?? `clip ${clipIndex + 1}`} → cut≈${cutSec.toFixed(2)}s ` +
        `start=${start.toFixed(2)}s len=${lengthSec}s peak=${peakOpacity} (SVG overlay)`
    )
  }

  return {
    clips: [
      {
        asset: { type: 'image', src: CLIP_FLASH_SVG_URL },
        start,
        length: lengthSec,
        fit: 'none',
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        position: 'center',
        opacity: [
          { from: 0, to: peakOpacity, start: 0, length: fadeInSec },
          {
            from: peakOpacity,
            to: peakOpacity,
            start: fadeInSec,
            length: holdSec,
          },
          {
            from: peakOpacity,
            to: 0,
            start: fadeInSec + holdSec,
            length: fadeOutSec,
          },
        ],
      },
    ],
  }
}

function buildClipBoundaryTransition(
  clipIndex: number,
  sequenceLength: number
): { out?: string } {
  const out = CLIP_BOUNDARY_TRANSITIONS[clipIndex]
  if (out && clipIndex + 1 < sequenceLength) {
    return { out }
  }
  return {}
}

function buildVideoTracks(sequence: SequenceItem[], clipUrls: string[]): ShotstackTrack[] {
  const linearStarts = computeLinearStarts(sequence)
  const overlap = CLIP_TRANSITION_OVERLAP_SEC
  const transitionCount = countActiveClipTransitions(sequence.length)

  if (sequence.length === 0) return []

  const buildMainClip = (i: number, start: number, extra?: Partial<ShotstackClip>): ShotstackClip => {
    const item = sequence[i]!
    const src = clipUrls[item.clip_index] ?? clipUrls[0]
    let length = Number(item.trim_duration.toFixed(3))
    if (i === sequence.length - 1 && sequence.length > 1) {
      length = Number((length + overlap * transitionCount).toFixed(3))
    }

    return {
      asset: {
        type: 'video',
        src,
        trim: Number(item.trim_start.toFixed(3)),
        volume: 1,
        transcode: true,
      },
      start: Number(start.toFixed(3)),
      length,
      fit: 'cover',
      ...(i > 0 ? { effect: 'zoomIn' as const } : {}),
      ...extra,
    }
  }

  if (sequence.length === 1) {
    const item = sequence[0]!
    const src = clipUrls[item.clip_index] ?? clipUrls[0]
    return [{ clips: buildFirstClipIntroClips(item, src, false) }]
  }

  const topClips: ShotstackClip[] = []
  const bottomClips: ShotstackClip[] = []

  const item0 = sequence[0]!
  const src0 = clipUrls[item0.clip_index] ?? clipUrls[0]
  topClips.push(...buildFirstClipIntroClips(item0, src0, !!CLIP_BOUNDARY_TRANSITIONS[0]))

  for (let i = 1; i < sequence.length; i++) {
    const start = linearStarts[i]! - overlap * countOverlapsBeforeClip(i, sequence.length)
    const item = sequence[i]!
    const src = clipUrls[item.clip_index] ?? clipUrls[0]
    let length = Number(item.trim_duration.toFixed(3))
    if (i === sequence.length - 1 && sequence.length > 1) {
      length = Number((length + overlap * transitionCount).toFixed(3))
    }

    let extras: Partial<ShotstackClip> = {}
    const boundaryTransition = buildClipBoundaryTransition(i, sequence.length)
    if (Object.keys(boundaryTransition).length > 0) {
      extras.transition = boundaryTransition
    }

    // Clip 5: alargar hasta cubrir el wipe del 6º (fadeFast arriba)
    if (i === CLIP_6_AT_INDEX - 1 && sequence.length > CLIP_6_AT_INDEX) {
      const clip6Start = computeClipVideoStartSec(sequence, CLIP_6_AT_INDEX)
      const holdThrough = Number((clip6Start + CLIP_6_WIPE_UNDERLAY_SEC - start).toFixed(3))
      length = Number(Math.max(length, holdThrough).toFixed(3))
    }

    // Clip 6: underlay del 5 + wipeLeft in (sin negro bajo el wipe)
    if (i === CLIP_6_AT_INDEX && sequence.length > CLIP_6_AT_INDEX) {
      const clip5Item = sequence[CLIP_6_AT_INDEX - 1]!
      const clip5Src = clipUrls[clip5Item.clip_index] ?? clipUrls[0]
      const clip5Start = computeClipVideoStartSec(sequence, CLIP_6_AT_INDEX - 1)
      const elapsed = Math.max(0, start - clip5Start)
      const underlayTrim = Number((clip5Item.trim_start + elapsed).toFixed(3))
      bottomClips.push({
        asset: {
          type: 'video',
          src: clip5Src,
          trim: underlayTrim,
          volume: 0,
          transcode: true,
        },
        start: Number(start.toFixed(3)),
        length: CLIP_6_WIPE_UNDERLAY_SEC,
        fit: 'cover',
      })
      extras.transition = { in: CLIP_6_ENTER_TRANSITION_IN }
    }

    const clip = buildMainClip(i, start, extras)
    if (i % 2 === 0) topClips.push(clip)
    else bottomClips.push(clip)
  }

  const tracks: ShotstackTrack[] = []
  if (topClips.length > 0) tracks.push({ clips: topClips })
  if (bottomClips.length > 0) tracks.push({ clips: bottomClips })
  return tracks
}

function buildBrollOverlayTracks(sequence: SequenceItem[], clipUrls: string[]): ShotstackTrack[] {
  const starts = computeLinearStarts(sequence)
  const clips: ShotstackClip[] = []
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]!
    const ov = item.visual_overlay
    if (!ov) continue
    const src = clipUrls[ov.clip_index]
    if (!src) continue
    clips.push({
      asset: {
        type: 'video',
        src,
        trim: Number(ov.trim_start.toFixed(3)),
        volume: 0,
        transcode: true,
      },
      start: starts[i],
      length: Number(item.trim_duration.toFixed(3)),
      fit: 'cover',
    })
  }
  return clips.length > 0 ? [{ clips }] : []
}

function buildMusicTrack(
  musicUrl: string,
  totalDuration: number,
  musicTrimStartSec: number
): ShotstackTrack | null {
  const url = musicUrl?.trim()
  if (!url) return null
  return {
    clips: [
      {
        asset: {
          type: 'audio',
          src: url,
          trim: Number(Math.max(0, musicTrimStartSec).toFixed(3)),
          volume: 0.17,
          effect: 'fadeOut',
        },
        start: 0,
        length: Number(totalDuration.toFixed(3)),
      },
    ],
  }
}

function resolveMotorMentionSfxUrl(): string {
  return (process.env.VIDEO_SFX_MOTOR_URL?.trim() || DEFAULT_MOTOR_MENTION_SFX_URL).trim()
}

function isMotorWord(text: string): boolean {
  return /^motor$/i.test(text.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim())
}

function blockMentionsMotor(block: SubtitleBlock): boolean {
  return block.text.trim().split(/\s+/).some(isMotorWord)
}

function collectMotorMentionTimes(blocks: SubtitleBlock[], totalDuration: number): number[] {
  const raw: number[] = []

  for (const block of blocks) {
    if (!block.text?.trim() || block.time >= totalDuration) continue

    if (block.words?.length) {
      for (const w of block.words) {
        if (w.start >= totalDuration) continue
        if (isMotorWord(w.text)) raw.push(Number(w.start.toFixed(3)))
      }
      continue
    }

    if (blockMentionsMotor(block)) {
      raw.push(Number(block.time.toFixed(3)))
    }
  }

  raw.sort((a, b) => a - b)
  const deduped: number[] = []
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1]! >= MOTOR_MENTION_SFX_MIN_GAP_SEC) {
      deduped.push(t)
    }
  }
  return deduped
}

function buildMotorMentionSfxTrack(
  subtitleBlocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack | null {
  const url = resolveMotorMentionSfxUrl()
  if (!url) return null

  const times = collectMotorMentionTimes(subtitleBlocks, totalDuration)
  if (times.length === 0) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX motor → ${times.length} hit(s) vol=${MOTOR_MENTION_SFX_VOLUME} ` +
        times.map((t) => `t=${t.toFixed(2)}s`).join(', ')
    )
  }

  return {
    clips: times.map((start) => ({
      asset: {
        type: 'audio',
        src: url,
        trim: 0,
        volume: MOTOR_MENTION_SFX_VOLUME,
      },
      start,
      length: MOTOR_MENTION_SFX_LENGTH_SEC,
    })),
  }
}

function resolveTransmissionGearSfxUrl(): string {
  return (process.env.VIDEO_SFX_TRANSMISSION_URL?.trim() || DEFAULT_TRANSMISSION_GEAR_SFX_URL).trim()
}

function normalizeSubtitleToken(text: string): string {
  return text.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

function isTransmissionWord(text: string): boolean {
  return /^transmis/i.test(normalizeSubtitleToken(text))
}

function isGearTypeWord(text: string): boolean {
  return /^(manual|autom[aá]t)/i.test(normalizeSubtitleToken(text))
}

function blockMentionsTransmissionGear(text: string): boolean {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length - 1; i++) {
    if (isTransmissionWord(words[i]!) && isGearTypeWord(words[i + 1]!)) return true
  }
  return false
}

function collectTransmissionGearTimes(blocks: SubtitleBlock[], totalDuration: number): number[] {
  const raw: number[] = []

  for (const block of blocks) {
    if (!block.text?.trim() || block.time >= totalDuration) continue

    if (block.words?.length) {
      let matched = false
      for (let i = 0; i < block.words.length - 1; i++) {
        const w1 = block.words[i]!
        const w2 = block.words[i + 1]!
        if (w2.start >= totalDuration) continue
        if (isTransmissionWord(w1.text) && isGearTypeWord(w2.text)) {
          raw.push(Number(w2.start.toFixed(3)))
          matched = true
        }
      }
      if (matched) continue
    }

    if (blockMentionsTransmissionGear(block.text)) {
      raw.push(Number(block.time.toFixed(3)))
    }
  }

  raw.sort((a, b) => a - b)
  const deduped: number[] = []
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1]! >= MOTOR_MENTION_SFX_MIN_GAP_SEC) {
      deduped.push(t)
    }
  }
  return deduped
}

function buildTransmissionGearSfxTrack(
  subtitleBlocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack | null {
  const url = resolveTransmissionGearSfxUrl()
  if (!url) return null

  const times = collectTransmissionGearTimes(subtitleBlocks, totalDuration)
  if (times.length === 0) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX transmisión → ${times.length} hit(s) vol=${TRANSMISSION_GEAR_SFX_VOLUME} ` +
        times.map((t) => `t=${t.toFixed(2)}s`).join(', ')
    )
  }

  return {
    clips: times.map((start) => ({
      asset: {
        type: 'audio',
        src: url,
        trim: 0,
        volume: TRANSMISSION_GEAR_SFX_VOLUME,
      },
      start,
      length: TRANSMISSION_GEAR_SFX_LENGTH_SEC,
    })),
  }
}

function resolveClipTransitionWhooshUrl(): string {
  return (
    process.env.VIDEO_SFX_WHOOSH_URL?.trim() ||
    process.env.VIDEO_SFX_TRANSITION_WHOOSH_URL?.trim() ||
    DEFAULT_CLIP_TRANSITION_WHOOSH_URL
  ).trim()
}

function buildClipTransitionWhooshTrack(
  sequence: SequenceItem[],
  jobId?: string
): ShotstackTrack | null {
  const url = resolveClipTransitionWhooshUrl()
  if (!url) return null

  const clips: ShotstackClip[] = []

  for (const clipIndex of CLIP_WHOOSH_AT_CLIP_INDICES) {
    if (sequence.length <= clipIndex) continue
    const cutSec = computeClipVideoStartSec(sequence, clipIndex)
    const start = Number(Math.max(0, cutSec - CLIP_TRANSITION_WHOOSH_LEAD_SEC).toFixed(3))
    clips.push({
      asset: {
        type: 'audio',
        src: url,
        trim: 0,
        volume: CLIP_TRANSITION_WHOOSH_VOLUME,
      },
      start,
      length: CLIP_TRANSITION_WHOOSH_LENGTH_SEC,
    })
  }

  if (clips.length === 0) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX whoosh clip 2/4 → ${clips.length} hit(s) vol=${CLIP_TRANSITION_WHOOSH_VOLUME} ` +
        clips.map((c) => `t=${(c.start as number).toFixed(2)}s`).join(', ')
    )
  }

  return { clips }
}

function resolveBrandTitlePopSfxUrl(): string {
  return (
    process.env.VIDEO_SFX_BRAND_POP_URL?.trim() ||
    process.env.VIDEO_SFX_POP_URL?.trim() ||
    DEFAULT_BRAND_TITLE_POP_SFX_URL
  ).trim()
}

function buildBrandTitlePopSfxTrack(
  brandStartSec: number,
  totalDuration: number,
  enabled: boolean,
  jobId?: string
): ShotstackTrack | null {
  if (!enabled) return null

  const url = resolveBrandTitlePopSfxUrl()
  if (!url) return null

  const start = Number(Math.max(0, Math.min(brandStartSec, totalDuration)).toFixed(3))
  if (start >= totalDuration) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX pop título → t=${start.toFixed(2)}s vol=${BRAND_TITLE_POP_SFX_VOLUME}`
    )
  }

  return {
    clips: [
      {
        asset: {
          type: 'audio',
          src: url,
          trim: 0,
          volume: BRAND_TITLE_POP_SFX_VOLUME,
        },
        start,
        length: BRAND_TITLE_POP_SFX_LENGTH_SEC,
      },
    ],
  }
}

function resolveComentaMentionSfxUrl(): string {
  return (
    process.env.VIDEO_SFX_COMENTA_URL?.trim() ||
    process.env.VIDEO_SFX_MOTOR_URL?.trim() ||
    DEFAULT_MOTOR_MENTION_SFX_URL
  ).trim()
}

function buildComentaMentionSfxTrack(
  comentaTimeSec: number | undefined,
  totalDuration: number,
  jobId?: string
): ShotstackTrack | null {
  if (comentaTimeSec == null) return null

  const url = resolveComentaMentionSfxUrl()
  if (!url) return null

  const start = Number(Math.max(0, Math.min(comentaTimeSec, totalDuration)).toFixed(3))
  if (start >= totalDuration) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX comenta → t=${start.toFixed(2)}s vol=${MOTOR_MENTION_SFX_VOLUME}`
    )
  }

  return {
    clips: [
      {
        asset: {
          type: 'audio',
          src: url,
          trim: 0,
          volume: MOTOR_MENTION_SFX_VOLUME,
        },
        start,
        length: MOTOR_MENTION_SFX_LENGTH_SEC,
      },
    ],
  }
}

/** SFX de relleno showcase: pop / whoosh según highlightFx en subtítulos (capa editorial). */
function buildHighlightSfxTrack(
  subtitleBlocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack | null {
  const popUrl = resolveBrandTitlePopSfxUrl()
  const whooshUrl = resolveClipTransitionWhooshUrl()
  if (!popUrl && !whooshUrl) return null

  const hits = subtitleBlocks
    .filter((b) => b.highlightFx && b.time < totalDuration)
    .sort((a, b) => a.time - b.time)

  if (hits.length === 0) return null

  const clips: ShotstackClip[] = []
  const logParts: string[] = []

  for (const b of hits) {
    const start = Number(Math.max(0, Math.min(b.time, totalDuration)).toFixed(3))
    if (start >= totalDuration) continue

    if ((b.highlightFx === 'pop' || b.highlightFx === 'yellow_pop') && popUrl) {
      clips.push({
        asset: {
          type: 'audio',
          src: popUrl,
          trim: 0,
          volume: BRAND_TITLE_POP_SFX_VOLUME,
        },
        start,
        length: BRAND_TITLE_POP_SFX_LENGTH_SEC,
      })
      logParts.push(`pop@t=${start.toFixed(2)}s`)
    }

    if (b.highlightFx === 'yellow_whoosh' && whooshUrl) {
      clips.push({
        asset: {
          type: 'audio',
          src: whooshUrl,
          trim: 0,
          volume: CLIP_TRANSITION_WHOOSH_VOLUME,
        },
        start,
        length: CLIP_TRANSITION_WHOOSH_LENGTH_SEC,
      })
      logParts.push(`whoosh@t=${start.toFixed(2)}s`)
    }
  }

  if (clips.length === 0) return null

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] SFX showcase → ${clips.length} hit(s) (${logParts.join(', ')})`
    )
  }

  return { clips }
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Duración del bloque de marca al inicio del Reel (segundos). */
const BRAND_OVERLAY_INTRO_SEC = 3.5

/**
 * Construye los overlays de marca usando rich-text (soporta stroke + shadow nativos).
 *
 * Layout:
 *   L1 (marca,   52px, blanco) — position:'top', cerca del borde superior
 *   L2 (modelo,  rojo)   — solo las 2 primeras palabras del modelo (limpio)
 *   L3 (modelo)           — solo la 2.ª palabra si no cabe en L2; nunca 3.ª palabra+
 *   L4 (año,     blanco) — position:'center', zona inferior
 */
function cleanVehicleText(text: string): string {
  return text
    .replace(/\b(AC|TM|TA|MT|AT)\b/gi, '')
    .replace(/\b(4X4|4X2|2X4|AWD|FWD|RWD)\b/gi, '')
    .replace(/\b\d+P\b/gi, '')
    .replace(/\b\d+\.\d+\b/g, '')
    .replace(/\b(FSI|TSI|TDI|TFSI|C|DSG|CVT|HYBRID|PHEV|EV|TURBO)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * L2: solo las 2 primeras palabras del modelo (p. ej. "grand vitara sz …" → "GRAND VITARA").
 * L3: únicamente si esas 2 palabras no caben en L2 → L2=1.ª, L3=2.ª. Nunca palabra 3+ (SZ, etc.).
 */
function splitModelLinesForBrandOverlay(modelRaw: string): { line2: string; line3Model: string } {
  const cleaned = cleanVehicleText(modelRaw)
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return { line2: '', line3Model: '' }
  if (words.length === 1) return { line2: words[0]!, line3Model: '' }

  const word1 = words[0]!
  const word2 = words[1]!
  const twoWordLine = `${word1} ${word2}`

  if (twoWordLine.length <= BRAND_L2_TWO_WORD_MAX_CHARS) {
    return { line2: twoWordLine, line3Model: '' }
  }

  return { line2: word1, line3Model: word2 }
}

function buildJumpThenFixed(baseY: number, totalLen: number): unknown[] {
  const A = 0.055
  const S = 0.08
  const settle = 4 * S
  const frames: unknown[] = [
    { from: baseY + A,        to: baseY - A,        start: 0,         length: S,   interpolation: 'bezier', easing: 'easeInOutSine' },
    { from: baseY - A,        to: baseY + A * 0.5,  start: S,         length: S,   interpolation: 'bezier', easing: 'easeInOutSine' },
    { from: baseY + A * 0.5,  to: baseY - A * 0.25, start: S * 2,     length: S,   interpolation: 'bezier', easing: 'easeInOutSine' },
    { from: baseY - A * 0.25, to: baseY,             start: S * 3,     length: S,   interpolation: 'bezier', easing: 'easeOutSine'   },
  ]
  const restLen = Number(Math.max(0.05, totalLen - settle).toFixed(3))
  frames.push({ from: baseY, to: baseY, start: Number(settle.toFixed(3)), length: restLen })
  return frames
}

function buildBrandOverlayTracks(
  brandConfig: BrandConfig | null | undefined,
  totalDuration: number,
  brandStart = 0,
  brandLength = BRAND_OVERLAY_INTRO_SEC
): ShotstackTrack[] {
  if (!brandConfig?.show_brand_overlays) return []

  const tracks: ShotstackTrack[] = []
  const line1 = cleanVehicleText(brandConfig.vehicle_line_1?.trim() || '')
  const { line2, line3Model } = splitModelLinesForBrandOverlay(
    brandConfig.vehicle_line_2?.trim() || ''
  )
  const line3Tagline = cleanVehicleText(brandConfig.vehicle_line_3?.trim() || '')
  const line3 = [line3Model, line3Tagline].filter(Boolean).join(' ')
  const line3IsModelOverflow = !!line3Model
  const line4 = cleanVehicleText(brandConfig.vehicle_line_4?.trim() || '')
  const cta   = brandConfig.cta_text?.trim() || ''
  const wa    = brandConfig.whatsapp_number?.trim() || ''

  const introLen = Number(Math.min(brandLength, totalDuration - brandStart).toFixed(3))

  const brandStyle = { textTransform: 'uppercase' }
  const brandAlign = { horizontal: 'center', vertical: 'middle' }

  // Tamaño dinámico de L2 según cantidad de palabras (base 720p → s720)
  const line2Words = line2 ? line2.split(/\s+/).length : 0
  const l2RealSize = brandL2FontSize(line2Words)

  // Sombra difusa simulada con blur:30 (rich-text beta)
  const shadowEffect = { offsetX: 0, offsetY: 0, blur: s720(30), color: '#000000', opacity: 1 }

  const bs = Number(brandStart.toFixed(3))
  const brandL1Size = s720(52)
  const brandL3Size = s720(52)
  const brandL4Size = s720(84)

  /**
   * Genera keyframes de "salto rápido al entrar, luego fijo".
   * 3 oscilaciones de amplitud decreciente en ~0.24s, después posición fija.
   */
  // ── L1: MARCA (blanco) ─────────────────────────────────────────
  if (line1) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line1.toUpperCase(),
          font:   { family: 'Montserrat', size: brandL1Size, weight: 900, color: '#FFFFFF', opacity: 1 },
          stroke: { width: s720(1), color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(700), height: s720(90),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.08, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line1.toUpperCase(),
          font:   { family: 'Montserrat', size: brandL1Size, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: s720(14), color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(760), height: s720(120),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.08, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── L2: MODELO (rojo, tamaño dinámico) ───────────────────────────────
  if (line2) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line2.toUpperCase(),
          font:   { family: 'Montserrat', size: l2RealSize, weight: 900, color: '#E63333', opacity: 1 },
          stroke: { width: s720(2), color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(700), height: s720(140),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.13, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line2.toUpperCase(),
          font:   { family: 'Montserrat', size: l2RealSize, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: s720(18), color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(760), height: s720(180),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.13, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── L3: resto del modelo (rojo) o tagline (blanco) ─────────────────
  if (line3) {
    const line3Words = line3.split(/\s+/).length
    const l3FontSize = line3IsModelOverflow ? brandL2FontSize(line3Words) : brandL3Size
    const l3Color = line3IsModelOverflow ? '#E63333' : '#FFFFFF'
    const l3StrokeWidth = line3IsModelOverflow ? s720(2) : s720(4)
    const l3ShadowStroke = line3IsModelOverflow ? s720(18) : s720(14)
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line3.toUpperCase(),
          font:   { family: 'Montserrat', size: l3FontSize, weight: 900, color: l3Color, opacity: 1 },
          stroke: { width: l3StrokeWidth, color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(700), height: s720(line3IsModelOverflow ? 140 : 90),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.25, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line3.toUpperCase(),
          font:   { family: 'Montserrat', size: l3FontSize, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: l3ShadowStroke, color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(760), height: s720(line3IsModelOverflow ? 180 : 130),
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.25, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── L4: AÑO (blanco) — zona inferior ────────────────────────────
  if (line4) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line4.toUpperCase(),
          font:   { family: 'Montserrat', size: brandL4Size, weight: 900, color: '#FFFFFF', opacity: 1 },
          stroke: { width: s720(5), color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(400), height: s720(120),
        position: 'center', offset: { x: 0, y: buildJumpThenFixed(-0.22, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line4.toUpperCase(),
          font:   { family: 'Montserrat', size: brandL4Size, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: s720(16), color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: s720(480), height: s720(170),
        position: 'center', offset: { x: 0, y: buildJumpThenFixed(-0.22, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── CTA (opcional) ────────────────────────────────────────────────────
  if (cta) {
    const FRAME_H = OUTPUT_HEIGHT
    const ctaH = s720(160)
    const ctaFontPx = s720(55)
    const ctaPadV = s720(18)
    const ctaPadH = s720(35)
    const ctaRadius = s720(25)
    // Centrado en la parte superior del frame, aparece tarde en el reel
    const ctaOffsetY = Number(((ctaH / 2 + s720(40)) / FRAME_H).toFixed(3))
    const timeStart = totalDuration >= 10 ? Math.max(0, totalDuration - 8) : 2
    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html:
              `<div style="background:#CC0000;border-radius:${ctaRadius}px;padding:${ctaPadV}px ${ctaPadH}px;` +
              `font-family:'Montserrat',sans-serif;font-weight:900;font-size:${ctaFontPx}px;` +
              `color:#FFFFFF;text-transform:uppercase;text-align:center;line-height:1.2;">` +
              `${htmlEscape(cta)}</div>`,
            width: s720(580),
            height: ctaH,
            background: 'transparent',
          },
          start: Number(timeStart.toFixed(3)),
          length: 6,
          position: 'top',
          offset: { x: 0, y: ctaOffsetY },
          opacity: [{ from: 0, to: 1, start: 0, length: 0.2 }],
        },
      ],
    })
  }

  // ── WhatsApp (opcional) ───────────────────────────────────────────────
  if (wa) {
    const waLabelPx = s720(28)
    const waNumberPx = s720(52)
    const waPadV = s720(12)
    const waPadH = s720(25)
    const waRadius = s720(18)
    const timeStart = totalDuration >= 8 ? Math.max(0, totalDuration - 6) : 2
    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html:
              `<div style="background:#CC0000;border-radius:${waRadius}px;padding:${waPadV}px ${waPadH}px;` +
              `font-family:'Montserrat',sans-serif;color:#FFFFFF;text-align:center;` +
              `display:flex;flex-direction:column;align-items:center;">\n` +
              `<span style="font-size:${waLabelPx}px;font-weight:700;letter-spacing:2px;">WHATSAPP</span>\n` +
              `<span style="font-size:${waNumberPx}px;font-weight:900;letter-spacing:1px;">${htmlEscape(wa)}</span>\n` +
              `</div>`,
            width: s720(660),
            height: s720(140),
            background: 'transparent',
          },
          start: Number(timeStart.toFixed(3)),
          length: 5,
          position: 'bottom',
          offset: { x: 0, y: 0.28 },
          transition: { in: 'slideUp' },
        },
      ],
    })
  }

  return tracks
}

function resolveClosingLogoUrl(
  callbackBase: string,
  brandConfig: BrandConfig | null | undefined
): string {
  const custom = brandConfig?.logo_url?.trim()
  if (custom) return custom
  return `${callbackBase}${DEFAULT_CLOSING_LOGO_PATH}`
}

function resolveWhatsAppCtaUrl(): string {
  return process.env.WHATSAPP_CTA_URL?.trim() || DEFAULT_WHATSAPP_CTA_URL
}

function logComentaOverlayDebug(
  jobId: string | undefined,
  trackIndex: number,
  clip: ShotstackClip,
  meta: { text: string; startSec: number }
): void {
  const tag = `[Shotstack]${jobId ? `[${jobId}]` : ''}[COMENTA-DEBUG]`
  const asset = clip.asset as Record<string, unknown>
  const assetW = asset.width as number | undefined
  const assetH = asset.height as number | undefined
  console.log(
    `${tag} track[${trackIndex}] asset=${String(asset.type)} ` +
      `start=${clip.start}s len=${clip.length}s ` +
      `position=${JSON.stringify(clip.position)} offset=${JSON.stringify(clip.offset)} ` +
      `box=${assetW ?? clip.width}x${assetH ?? clip.height}`
  )
  console.log(
    `${tag} text="${meta.text}" startSec=${meta.startSec} ` +
      `font=${COMENTA_FONT_FAMILY} y=${COMENTA_LINE1_OFFSET_Y}/${COMENTA_LINE2_OFFSET_Y} (misma escala que captions)`
  )
}

function buildComentaSlideX(totalLen: number): unknown[] {
  const slideSec = COMENTA_ENTRANCE_SLIDE_SEC
  const bounceSec = 0.08
  const restX = Number(Math.max(0.05, totalLen - slideSec - bounceSec).toFixed(3))
  return [
    { from: -0.85, to: 0.06, start: 0, length: slideSec, interpolation: 'bezier', easing: 'easeOutCubic' },
    { from: 0.06, to: 0, start: slideSec, length: bounceSec, interpolation: 'bezier', easing: 'easeInOutSine' },
    { from: 0, to: 0, start: slideSec + bounceSec, length: restX },
  ]
}

function buildComentaEntranceScale(totalLen: number): unknown[] {
  const popUpSec = 0.14
  const settleSec = 0.1
  const endPop = popUpSec + settleSec
  return [
    {
      from: 0.6,
      to: 1.12,
      start: 0,
      length: popUpSec,
      interpolation: 'bezier',
      easing: 'easeOutBack',
    },
    {
      from: 1.12,
      to: 1,
      start: popUpSec,
      length: settleSec,
      interpolation: 'bezier',
      easing: 'easeOutSine',
    },
    { from: 1, to: 1, start: endPop, length: Number(Math.max(0.05, totalLen - endPop).toFixed(3)) },
  ]
}

function buildComentaOverlayTracks(
  text: string,
  startSec: number,
  totalDuration: number
): ShotstackTrack[] {
  const displayText = text.trim().toUpperCase()
  if (!displayText) return []

  const start = Number(Math.max(0, startSec).toFixed(3))
  const length = Number(Math.max(0.4, totalDuration - start).toFixed(3))
  if (length < 0.4) return []

  const comentaLead = displayText.startsWith('COMENTA') ? 'COMENTA' : displayText.split(/\s+/)[0] ?? displayText
  const comentaRest = displayText.startsWith('COMENTA')
    ? displayText.slice('COMENTA'.length).trim()
    : displayText.split(/\s+/).slice(1).join(' ')

  const slideX = buildComentaSlideX(length)
  const scale = buildComentaEntranceScale(length)
  const align = { horizontal: 'center' as const, vertical: 'middle' as const }
  const style = { textTransform: 'uppercase' as const }

  const buildLineClip = (
    lineText: string,
    offsetY: number,
    height: number,
    fontSize: number,
    color: string
  ): ShotstackClip => ({
    asset: {
      type: 'rich-text',
      text: lineText,
      font: {
        family: COMENTA_FONT_FAMILY,
        size: fontSize,
        weight: 900,
        color,
        opacity: 1,
      },
      style,
      align,
    },
    start,
    length,
    width: COMENTA_TEXT_WIDTH_PX,
    height,
    position: 'top',
    offset: { x: slideX, y: buildJumpThenFixed(offsetY, length) },
    scale,
  })

  const tracks: ShotstackTrack[] = [{
    clips: [buildLineClip(comentaLead, COMENTA_LINE1_OFFSET_Y, COMENTA_LINE_HEIGHT_PX, comentaCaptionFontSize(comentaLead), '#E63333')],
  }]

  if (comentaRest) {
    tracks.push({
      clips: [buildLineClip(comentaRest, COMENTA_LINE2_OFFSET_Y, COMENTA_LINE_HEIGHT_PX, comentaCaptionFontSize(comentaRest), '#FFFFFF')],
    })
  }

  return tracks
}

function buildBrandLogoTrack(logoUrl: string, start: number, length: number): ShotstackTrack | null {
  const url = logoUrl.trim()
  if (!url || length < 0.4) return null
  const entrance = CLOSING_LOGO_ENTRANCE_SEC
  return {
    clips: [
      {
        asset: { type: 'image', src: url },
        start: Number(start.toFixed(3)),
        length: Number(length.toFixed(3)),
        fit: 'contain',
        width: CLOSING_LOGO_WIDTH_PX,
        height: CLOSING_LOGO_HEIGHT_PX,
        position: 'bottom',
        offset: {
          x: 0,
          y: [
            {
              from: 0.20,
              to: 0.080,
              start: 0,
              length: entrance,
              interpolation: 'bezier',
              easing: 'easeOutBack',
            },
          ],
        },
        scale: [
          {
            from: 0,
            to: 1.15,
            start: 0,
            length: entrance * 0.75,
            interpolation: 'bezier',
            easing: 'easeOutBack',
          },
          {
            from: 1.15,
            to: 1,
            start: entrance * 0.75,
            length: entrance * 0.25,
            interpolation: 'bezier',
            easing: 'easeOutQuad',
          },
        ],
        opacity: [{ from: 0, to: 1, start: 0, length: 0.12 }],
        transition: { in: 'zoom', out: 'fade' },
      },
    ],
  }
}

function buildOpeningLogoTrack(logoUrl: string, totalDuration: number): ShotstackTrack | null {
  const length = Number(Math.min(CLOSING_LOGO_LEN_SEC, totalDuration).toFixed(3))
  return buildBrandLogoTrack(logoUrl, 0, length)
}

function buildClosingLogoTrack(logoUrl: string, totalDuration: number): ShotstackTrack | null {
  const length = Number(Math.min(CLOSING_LOGO_LEN_SEC, totalDuration).toFixed(3))
  const start = Number(Math.max(0, totalDuration - length).toFixed(3))
  return buildBrandLogoTrack(logoUrl, start, length)
}

function buildWhatsAppCtaTrack(
  imageUrl: string,
  startSec: number,
  totalDuration: number
): ShotstackTrack | null {
  const url = imageUrl.trim()
  if (!url) return null
  const start = Number(Math.max(0, startSec).toFixed(3))
  const length = Number(Math.max(0.4, totalDuration - start).toFixed(3))
  if (length < 0.4) return null
  return {
    clips: [
      {
        asset: { type: 'image', src: url },
        start,
        length,
        fit: 'contain',
        width: WHATSAPP_CTA_WIDTH_PX,
        height: WHATSAPP_CTA_HEIGHT_PX,
        position: 'bottom',
        offset: { x: 0, y: WHATSAPP_CTA_OFFSET_Y },
        opacity: [{ from: 0, to: 1, start: 0, length: 0.25 }],
        transition: { in: 'fade' },
      },
    ],
  }
}

/**
 * Calcula el font-size para el subtítulo según el texto (legacy HTML; base 720p escalada).
 *
 * Montserrat Black: ~0.68em por carácter (mayúsculas).
 * Objetivo: que la línea CSS más larga quepa en el ancho útil del frame 1080p.
 */
function captionFontSize(text: string): number {
  const USEFUL_W = s720(680)
  const EM = 0.68

  const words = text.trim().split(/\s+/)

  function longestLineChars(targetFontPx: number): number {
    const maxPx = USEFUL_W
    let maxLine = 0
    let cur = 0
    for (const w of words) {
      const wPx = w.length * EM * targetFontPx
      const space = cur > 0 ? EM * targetFontPx : 0
      if (cur > 0 && cur + space + wPx > maxPx) {
        maxLine = Math.max(maxLine, cur)
        cur = wPx
      } else {
        cur += (cur > 0 ? space : 0) + wPx
      }
    }
    return Math.max(maxLine, cur)
  }

  let lo = s720(36), hi = s720(75), best = s720(36)
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)

    const maxPx = USEFUL_W
    let lines = 1
    let cur = 0
    for (const w of words) {
      const wPx = w.length * EM * mid
      const space = cur > 0 ? EM * mid : 0
      if (cur > 0 && cur + space + wPx > maxPx) {
        lines++
        cur = wPx
      } else {
        cur += (cur > 0 ? space : 0) + wPx
      }
    }
    const longest = longestLineChars(mid)

    if (lines <= 2 && longest <= USEFUL_W) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return best % 2 === 0 ? best : best - 1
}

/**
 * Cuando dos subtítulos se solapan, TRUNCA el anterior para que el siguiente pueda aparecer.
 * Nunca descarta ningún subtítulo — solo recorta duración si es necesario.
 */
function dropOverlappingSubtitleBlocks(blocks: SubtitleBlock[], jobId: string): SubtitleBlock[] {
  const sorted = [...blocks]
    .filter((b) => b.text?.trim() && b.duration > 0.01)
    .sort((a, b) => a.time - b.time)
  const out: SubtitleBlock[] = []
  for (const b of sorted) {
    const prev = out.length > 0 ? out[out.length - 1]! : null
    if (prev && b.time < prev.time + prev.duration) {
      // Truncar el anterior para que termine justo antes de que empiece éste
      const trimmedDur = Number(Math.max(0.08, b.time - prev.time - 0.02).toFixed(3))
      out[out.length - 1] = { ...prev, duration: trimmedDur }
      console.log(
        `[Shotstack][${jobId}] Subtítulo anterior truncado t=${prev.time.toFixed(2)}s ` +
          `${prev.duration.toFixed(2)}s → ${trimmedDur.toFixed(2)}s para dar paso a "${b.text.trim().slice(0, 30)}"`
      )
    }
    out.push(b)
  }
  return out
}

function buildCaptionHtmlTracks(
  blocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack[] {
  void totalDuration
  const safe = jobId ? dropOverlappingSubtitleBlocks(blocks, jobId) : blocks
  const validBlocks = safe.filter((b) => b.text?.trim() && b.duration > 0.01)
  if (validBlocks.length === 0) return []

  const captionStyle = { textTransform: 'uppercase' }
  const captionAlign = { horizontal: 'center', vertical: 'middle' }

  const captionShadowEffect = { offsetX: 0, offsetY: 0, blur: s720(30), color: '#000000', opacity: 1 }
  const captionBoxW = s720(700)
  const captionBoxH = s720(200)
  const longPairBoxW = s720(680)
  const longPairBoxH = s720(180)

  // Posición alterna: par → abajo (y: 0.15), impar → arriba/centro (y: 0.70)
  const captionPositionY = (idx: number) => (idx % 2 === 0 ? 0.15 : 0.70)

  // Palabras técnicas del vehículo que reciben animación de ola
  const TECH_SPEC_RE = /\b(MOTOR|TRANSMIS|MANUAL|AUTOM[AÁ]T|TURBO|D[IÍ]ESEL|GASOLINA|TURBO|HP|CV|CC|4X[24]|\d+[\.,]\d+|\d{4}CC)\b/i

  // Genera keyframes de ola (oscilación suave) alrededor de la posición base
  function buildWaveOffset(baseY: number, durationSec: number): unknown[] {
    const HALF_PERIOD = 0.35  // segundos por medio ciclo
    const AMPLITUDE   = 0.025 // ±2.5% del frame height
    const frames: unknown[] = []
    let t = 0
    let phase = 0 // 0 = sube, 1 = baja
    while (t < durationSec - 0.05) {
      const len = Number(Math.min(HALF_PERIOD, durationSec - t).toFixed(3))
      const from = phase === 0 ? baseY          : baseY + AMPLITUDE
      const to   = phase === 0 ? baseY + AMPLITUDE : baseY
      frames.push({ from, to, start: Number(t.toFixed(3)), length: len, interpolation: 'bezier', easing: 'easeInOutSine' })
      t += HALF_PERIOD
      phase = 1 - phase
    }
    return frames
  }

  function captionOffsetY(text: string, idx: number, durationSec: number): unknown {
    const baseY = captionPositionY(idx)
    if (TECH_SPEC_RE.test(text)) {
      const frames = buildWaveOffset(baseY, durationSec)
      if (frames.length >= 2) return frames
    }
    return baseY
  }

  function isLongPair(text: string): boolean {
    if (isDriveBadgeText(text)) return false
    const words = text.trim().split(/\s+/)
    return words.length === 2 && words.every(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 5)
  }

  function isYellowHighlightBlock(b: SubtitleBlock): boolean {
    return b.highlightFx === 'yellow_whoosh' || b.highlightFx === 'yellow_pop'
  }

  const driveBadgeBlocks = validBlocks.filter((b) => isDriveBadgeText(b.text))
  const nonDriveBlocks = validBlocks.filter((b) => !isDriveBadgeText(b.text))
  const longPairBlocks = nonDriveBlocks.filter(b => isLongPair(b.text.trim().toUpperCase()))
  const highlightYellowBlocks = nonDriveBlocks.filter((b) => isYellowHighlightBlock(b))
  const regularBlocks = nonDriveBlocks.filter(
    (b) => !isLongPair(b.text.trim().toUpperCase()) && !isYellowHighlightBlock(b)
  )

  const driveBadgeClips: ShotstackClip[] = driveBadgeBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = overlayCaptionFontSize(text)
    return {
      asset: {
        type: 'rich-text',
        text,
        font: { family: 'Montserrat', size: sz, weight: 900, color: '#FFE100', opacity: 1 },
        style: captionStyle,
        align: captionAlign,
      },
      start: Number(b.time.toFixed(3)),
      length: Number(b.duration.toFixed(3)),
      width: captionBoxW,
      height: captionBoxH,
      position: 'bottom',
      offset: { x: 0, y: captionOffsetY(text, idx, b.duration) },
    }
  })

  const highlightYellowClips: ShotstackClip[] = highlightYellowBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = overlayCaptionFontSize(text)
    return {
      asset: {
        type: 'rich-text',
        text,
        font: { family: 'Montserrat', size: sz, weight: 900, color: '#FFE100', opacity: 1 },
        style: captionStyle,
        align: captionAlign,
      },
      start: Number(b.time.toFixed(3)),
      length: Number(b.duration.toFixed(3)),
      width: captionBoxW,
      height: captionBoxH,
      position: 'bottom',
      offset: { x: 0, y: captionOffsetY(text, idx, b.duration) },
    }
  })

  // CAPA 2 (texto real) — blanco, sin transition para que aparezca instantáneamente
  const realClips: ShotstackClip[] = regularBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = overlayCaptionFontSize(text)
    return {
      asset: {
        type: 'rich-text',
        text,
        font:   { family: 'Montserrat', size: sz, weight: 900, color: '#FFFFFF', opacity: 1 },
        style:  captionStyle,
        align:  captionAlign,
      },
      start: Number(b.time.toFixed(3)),
      length: Number(b.duration.toFixed(3)),
      width: captionBoxW, height: captionBoxH,
      position: 'bottom', offset: { x: 0, y: captionOffsetY(text, idx, b.duration) },
    }
  })

  // CAPA 1 (sombra) — misma posición alterna que la capa real
  const shadowClips: ShotstackClip[] = regularBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = overlayCaptionFontSize(text)
    return {
      asset: {
        type: 'rich-text',
        text,
        font:   { family: 'Montserrat', size: sz, weight: 900, color: '#000000', opacity: 1 },
        shadow: captionShadowEffect,
        style:  captionStyle,
        align:  captionAlign,
      },
      start: Number(b.time.toFixed(3)),
      length: Number(b.duration.toFixed(3)),
      width: captionBoxW, height: captionBoxH,
      position: 'bottom', offset: { x: 0, y: captionOffsetY(text, idx, b.duration) },
    }
  })

  // PARES LARGOS — amarillo, word1 arriba-izquierda, word2 abajo-derecha, sin sombra
  // Si es TRANSMISIÓN + MANUAL/AUTOMÁTICO → brinco al entrar (igual que el título)
  const TRANSMISION_RE = /^TRANSMIS/i
  const GEAR_TYPE_RE   = /^(MANUAL|AUTOM[AÁ]T)/i

  const lpWord1Clips: ShotstackClip[] = []
  const lpWord2Clips: ShotstackClip[] = []

  for (const b of longPairBlocks) {
    const words = b.text.trim().toUpperCase().split(/\s+/)
    const w1 = words[0]!
    const w2 = words[1]!
    const start  = Number(b.time.toFixed(3))
    const length = Number(b.duration.toFixed(3))

    const isTransmisionPair = TRANSMISION_RE.test(w1) && GEAR_TYPE_RE.test(w2)
    const y1 = 0.20
    const y2 = 0.15

    lpWord1Clips.push({
      asset: {
        type: 'rich-text',
        text: w1,
        font:  { family: 'Montserrat', size: longPairFontSize(w1), weight: 900, color: '#FFE100', opacity: 1 },
        style: captionStyle,
        align: captionAlign,
      },
      start, length,
      width: longPairBoxW, height: longPairBoxH,
      position: 'bottom',
      offset: { x: -0.10, y: isTransmisionPair ? buildJumpThenFixed(y1, length) : y1 },
    })

    lpWord2Clips.push({
      asset: {
        type: 'rich-text',
        text: w2,
        font:  { family: 'Montserrat', size: longPairFontSize(w2), weight: 900, color: '#FFE100', opacity: 1 },
        style: captionStyle,
        align: captionAlign,
      },
      start, length,
      width: longPairBoxW, height: longPairBoxH,
      position: 'bottom',
      offset: { x: 0.10, y: isTransmisionPair ? buildJumpThenFixed(y2, length) : y2 },
    })
  }

  const tracks: ShotstackTrack[] = [{ clips: realClips }, { clips: shadowClips }]
  if (driveBadgeClips.length > 0) {
    tracks.push({ clips: driveBadgeClips })
  }
  if (highlightYellowClips.length > 0) {
    tracks.push({ clips: highlightYellowClips })
  }
  if (lpWord1Clips.length > 0) {
    tracks.push({ clips: lpWord1Clips })
    tracks.push({ clips: lpWord2Clips })
  }

  // Brillitos detrás del texto, mismo lugar y tamaño aproximado (contorno, no tapa palabras)
  const sparkleUrl = process.env.SPARKLE_OVERLAY_URL?.trim()
  if (sparkleUrl) {
    function isMotorOrNumberSubtitle(text: string): boolean {
      const t = text.trim().toUpperCase()
      return /\bMOTOR\b/.test(t) || /\b\d+[\.,]\d+\b/.test(t)
    }

    function isSparkleSubtitle(text: string): boolean {
      return isMotorOrNumberSubtitle(text) || isDriveBadgeText(text)
    }

    function isTransmisionGearSubtitle(text: string): boolean {
      const words = text.trim().toUpperCase().split(/\s+/)
      if (words.length !== 2) return false
      return TRANSMISION_RE.test(words[0]!) && GEAR_TYPE_RE.test(words[1]!)
    }

    function sparkleBoxForText(text: string, fontSize: number): { width: number; height: number } {
      const len = text.trim().length
      const textW = Math.ceil(len * fontSize * 0.52)
      const textH = Math.ceil(fontSize * 1.25)
      return {
        width: Math.min(s720(700), Math.max(s720(150), Math.ceil(textW * 1.45))),
        height: Math.max(s720(85), Math.ceil(textH * 1.55)),
      }
    }

    function sparkleBoxForWord(word: string, fontSize: number): { width: number; height: number } {
      const len = word.length
      const textW = Math.ceil(len * fontSize * 0.58)
      const textH = Math.ceil(fontSize * 1.2)
      return {
        width: Math.min(s720(520), Math.max(s720(160), Math.ceil(textW * 1.5))),
        height: Math.max(s720(90), Math.ceil(textH * 1.6)),
      }
    }

    function buildSparkleClip(
      start: number,
      length: number,
      offset: { x: number; y: unknown },
      box: { width: number; height: number }
    ): ShotstackClip {
      return {
        asset: {
          type: 'video' as const,
          src: sparkleUrl,
          trim: 0,
          volume: 0,
        },
        start: Number(start.toFixed(3)),
        length: Number(length.toFixed(3)),
        fit: 'contain' as const,
        width: box.width,
        height: box.height,
        position: 'bottom' as const,
        offset,
        opacity: 0.88,
      }
    }

    const sparkleClips: ShotstackClip[] = []

    for (const [idx, b] of regularBlocks.entries()) {
      const text = b.text.trim()
      if (!isSparkleSubtitle(text)) continue
      const upper = text.toUpperCase()
      sparkleClips.push(
        buildSparkleClip(
          b.time,
          b.duration,
          { x: 0, y: captionOffsetY(upper, idx, b.duration) },
          sparkleBoxForText(upper, overlayCaptionFontSize(upper))
        )
      )
    }

    for (const [idx, b] of highlightYellowBlocks.entries()) {
      const text = b.text.trim().toUpperCase()
      sparkleClips.push(
        buildSparkleClip(
          b.time,
          b.duration,
          { x: 0, y: captionOffsetY(text, idx, b.duration) },
          sparkleBoxForText(text, overlayCaptionFontSize(text))
        )
      )
    }

    for (const [idx, b] of driveBadgeBlocks.entries()) {
      const text = b.text.trim().toUpperCase()
      sparkleClips.push(
        buildSparkleClip(
          b.time,
          b.duration,
          { x: 0, y: captionOffsetY(text, idx, b.duration) },
          sparkleBoxForText(text, overlayCaptionFontSize(text))
        )
      )
    }

    for (const b of longPairBlocks) {
      if (!isTransmisionGearSubtitle(b.text)) continue
      const words = b.text.trim().toUpperCase().split(/\s+/)
      const w1 = words[0]!
      const w2 = words[1]!
      const start = b.time
      const length = b.duration
      const y1 = 0.20
      const y2 = 0.15
      const y1Offset = buildJumpThenFixed(y1, length)
      const y2Offset = buildJumpThenFixed(y2, length)

      sparkleClips.push(
        buildSparkleClip(start, length, { x: -0.10, y: y1Offset }, sparkleBoxForWord(w1, longPairFontSize(w1))),
        buildSparkleClip(start, length, { x: 0.10, y: y2Offset }, sparkleBoxForWord(w2, longPairFontSize(w2)))
      )
    }

    if (sparkleClips.length > 0) {
      // Detrás del texto (primera capa) para que se vea en el contorno sin tapar
      tracks.unshift({ clips: sparkleClips })
    }
  }

  return tracks
}

async function postShotstackRender(apiKey: string, baseUrl: string, body: unknown): Promise<string> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // keep as text
  }

  if (!res.ok) {
    const detail =
      Array.isArray(json?.response?.errors) && json.response.errors.length > 0
        ? json.response.errors
            .map((e: { message?: string }) => e?.message)
            .filter(Boolean)
            .join('; ')
        : null
    const msg =
      detail ||
      (typeof json?.message === 'string' ? json.message : null) ||
      (typeof json?.error === 'string' ? json.error : null) ||
      text ||
      `HTTP ${res.status}`
    throw new Error(`[Shotstack] HTTP ${res.status}: ${msg}`)
  }

  const id = json?.response?.id
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('[Shotstack] Respuesta inesperada: no se encontró response.id')
  }
  return id
}

export async function renderSegmentsV2(
  jobId: string,
  sequence: SequenceItem[],
  clipUrls: string[],
  subtitleBlocks: SubtitleBlock[],
  musicUrl: string,
  voiceOverIntro?: VoiceOverIntroRenderInput | null,
  opts?: {
    musicTrimStartSecOverride?: number
    brandConfig?: BrandConfig | null
    /** Tiempo (s) en que el dialogo menciona la marca por primera vez (de Assembly) */
    brandMentionTimeSec?: number
    /** Duración (s) del overlay de marca */
    brandMentionLengthSec?: number
    /** Tiempo (s) en que el dialogo dice "comenta" (WhatsApp CTA) */
    comentaMentionTimeSec?: number
    /** Texto del dialogo de la escena "comenta" (overlay superior) */
    comentaOverlayText?: string
  }
): Promise<string> {
  if (voiceOverIntro != null) {
    throw new Error(
      '[Shotstack] voiceOverIntro aún no está soportado. Desactiva VO manual/MP3 para este render.'
    )
  }

  const { apiKey, baseUrl, callbackBase } = assertShotstackEnv()

  const totalDuration = Number(
    sequence.reduce((acc, it) => acc + Number(it.trim_duration.toFixed(3)), 0).toFixed(3)
  )

  const tracks: ShotstackTrack[] = []

  const hasBrandOverlays = Boolean(
    opts?.brandConfig?.show_brand_overlays === true &&
      (opts.brandConfig.vehicle_line_1?.trim() || opts.brandConfig.vehicle_line_2?.trim())
  )

  // Timing del overlay de marca: viene del pipeline (dialogo+Assembly) o fallback t=0
  const brandStart  = opts?.brandMentionTimeSec  ?? 0
  // +1 segundo extra de visibilidad cuando el timing viene de Assembly
  const brandLength = opts?.brandMentionTimeSec != null
    ? (opts.brandMentionLengthSec ?? BRAND_OVERLAY_INTRO_SEC) + 1
    : (opts?.brandMentionLengthSec ?? BRAND_OVERLAY_INTRO_SEC)

  if (hasBrandOverlays) {
    if (opts?.brandMentionTimeSec != null) {
      console.log(
        `[Shotstack][${jobId}] Brand overlay → t=${brandStart.toFixed(2)}s +${brandLength.toFixed(2)}s ` +
        `(timing desde dialogo+Assembly, +1s extra)`
      )
    } else {
      console.log(`[Shotstack][${jobId}] Brand overlay → t=0 +${brandLength}s (sin timing de dialogo)`)
    }
  }

  // Cortar 0.5s antes el último subtítulo que termina demasiado cerca del título
  const SUBTITLE_PRE_BRAND_GAP = 0.5
  const brandEnd = brandStart + brandLength
  const subtitleBlocksAdjusted = hasBrandOverlays
    ? subtitleBlocks.map(b => {
        const blockEnd = b.time + b.duration
        // Si el bloque termina dentro del "gap" antes del brand overlay → truncar
        if (b.time < brandStart && blockEnd > brandStart - SUBTITLE_PRE_BRAND_GAP) {
          const newDuration = Number(Math.max(0.1, brandStart - SUBTITLE_PRE_BRAND_GAP - b.time).toFixed(3))
          return { ...b, duration: newDuration }
        }
        return b
      })
    : subtitleBlocks

  // Los captions ya vienen filtrados desde pipeline (no contienen el bloque de marca)
  // Si por algún motivo aún hay overlap temporal con el overlay, suprimirlos
  const captionBlocksToRender = hasBrandOverlays
    ? subtitleBlocksAdjusted.filter(b => {
        const blockEnd = b.time + b.duration
        // Suprimir solo si el bloque está completamente dentro del overlay de marca
        return !(b.time >= brandStart - 0.05 && blockEnd <= brandEnd + 0.05)
      })
    : subtitleBlocksAdjusted

  tracks.push(...buildCaptionHtmlTracks(captionBlocksToRender, totalDuration, jobId))
  const captionCount = captionBlocksToRender.filter((b) => b.text?.trim() && b.duration > 0.01).length
  if (captionCount > 0) {
    const safe = dropOverlappingSubtitleBlocks(captionBlocksToRender, jobId)
    console.log(`[Shotstack][${jobId}] Subtítulos HTML (${safe.length} frases, sin solapar)`)
    for (const b of safe) {
      console.log(
        `[Shotstack][${jobId}]   caption t=${b.time.toFixed(2)}s +${b.duration.toFixed(2)}s ` +
          `"${b.text.trim().slice(0, 50)}${b.text.length > 50 ? '…' : ''}"`
      )
    }
  }

  // ── DEBUG brand config ─────────────────────────────────────────────────
  {
    const bc = opts?.brandConfig
    console.log(`[Shotstack][${jobId}] brandConfig recibido:`, JSON.stringify({
      show_brand_overlays: bc?.show_brand_overlays ?? null,
      vehicle_line_1:      bc?.vehicle_line_1     ?? null,
      vehicle_line_2:      bc?.vehicle_line_2     ?? null,
      vehicle_line_3:      bc?.vehicle_line_3     ?? null,
      vehicle_line_4:      bc?.vehicle_line_4     ?? null,
      cta_text:            bc?.cta_text           ?? null,
      logo_url:            bc?.logo_url           ?? null,
    }))
  }

  const brandOverlayTracks = buildBrandOverlayTracks(opts?.brandConfig ?? null, totalDuration, brandStart, brandLength)
  if (brandOverlayTracks.length > 0) {
    const bc = opts?.brandConfig
    console.log(
      `[Shotstack][${jobId}] Brand overlays ACTIVOS: L1="${bc?.vehicle_line_1 ?? ''}" ` +
        `L2="${bc?.vehicle_line_2 ?? ''}" L3="${bc?.vehicle_line_3 ?? ''}" ` +
        `L4="${bc?.vehicle_line_4 ?? ''}" (${brandOverlayTracks.length} tracks)`
    )
    // Log del clip de marca para verificar position/offset/html actuales
    const topClip = brandOverlayTracks[0]?.clips?.[0]
    if (topClip) {
      console.log(
        `[Shotstack][${jobId}] Brand top clip → position=${JSON.stringify((topClip as any).position)} ` +
          `offset=${JSON.stringify((topClip as any).offset)} ` +
          `htmlSnippet="${((topClip as any).asset?.html ?? '').slice(0, 250)}"`
      )
    }
  } else {
    const bc = opts?.brandConfig
    console.log(
      `[Shotstack][${jobId}] Brand overlays DESACTIVADOS — ` +
        `show_brand_overlays=${JSON.stringify(bc?.show_brand_overlays)}, ` +
        `líneas: L1="${bc?.vehicle_line_1 ?? ''}" L2="${bc?.vehicle_line_2 ?? ''}" ` +
        `L3="${bc?.vehicle_line_3 ?? ''}" L4="${bc?.vehicle_line_4 ?? ''}"`
    )
  }
  tracks.push(...brandOverlayTracks)

  if (opts?.comentaMentionTimeSec != null) {
    if (opts.comentaOverlayText?.trim()) {
      const comentaTracks = buildComentaOverlayTracks(
        opts.comentaOverlayText,
        opts.comentaMentionTimeSec,
        totalDuration
      )
      if (comentaTracks.length > 0) {
        for (let i = comentaTracks.length - 1; i >= 0; i--) {
          tracks.unshift(comentaTracks[i]!)
        }
        const comentaClip = comentaTracks[0]?.clips?.[0]
        if (comentaClip) {
          logComentaOverlayDebug(jobId, 0, comentaClip, {
            text: opts.comentaOverlayText.trim(),
            startSec: opts.comentaMentionTimeSec,
          })
        }
        console.log(
          `[Shotstack][${jobId}] Comenta overlay → t=${opts.comentaMentionTimeSec.toFixed(2)}s ` +
          `"${opts.comentaOverlayText.trim().slice(0, 40)}" (solo texto)`
        )
      }
    }

    const whatsappUrl = resolveWhatsAppCtaUrl()
    const whatsappTrack = buildWhatsAppCtaTrack(whatsappUrl, opts.comentaMentionTimeSec, totalDuration)
    if (whatsappTrack) {
      tracks.push(whatsappTrack)
      const waClip = whatsappTrack.clips?.[0]
      console.log(
        `[Shotstack][${jobId}][COMENTA-DEBUG] WhatsApp CTA track[${tracks.length - 1}] ` +
          `start=${waClip?.start}s position=${JSON.stringify(waClip?.position)} ` +
          `offset=${JSON.stringify(waClip?.offset)} ` +
          `box=${waClip?.width}x${waClip?.height} offsetY=${WHATSAPP_CTA_OFFSET_Y}`
      )
      console.log(
        `[Shotstack][${jobId}] WhatsApp CTA → t=${opts.comentaMentionTimeSec.toFixed(2)}s ` +
        `hasta fin (${(totalDuration - opts.comentaMentionTimeSec).toFixed(2)}s) ${whatsappUrl}`
      )
    }
  }

  const logoUrl = resolveClosingLogoUrl(callbackBase, opts?.brandConfig ?? null)
  const openingLogo = buildOpeningLogoTrack(logoUrl, totalDuration)
  if (openingLogo) {
    tracks.push(openingLogo)
    console.log(`[Shotstack][${jobId}] Logo de apertura (${CLOSING_LOGO_LEN_SEC}s iniciales): ${logoUrl}`)
  }

  const closingLogo = buildClosingLogoTrack(logoUrl, totalDuration)
  if (closingLogo) {
    tracks.push(closingLogo)
    console.log(`[Shotstack][${jobId}] Logo de cierre (${CLOSING_LOGO_LEN_SEC}s finales): ${logoUrl}`)
  }

  tracks.push(...buildBrollOverlayTracks(sequence, clipUrls))
  tracks.push(...buildVideoTracks(sequence, clipUrls))

  const flashTrack = buildClipFlashTransitionTrack(sequence, CLIP_FLASH_AT_CLIP_INDEX, jobId, {
    label: 'clip 4',
  })
  if (flashTrack) tracks.unshift(flashTrack)

  const musicTrim = opts?.musicTrimStartSecOverride ?? 0
  const musicTrack = buildMusicTrack(musicUrl, totalDuration, musicTrim)
  if (musicTrack) tracks.push(musicTrack)

  const motorSfxTrack = buildMotorMentionSfxTrack(captionBlocksToRender, totalDuration, jobId)
  if (motorSfxTrack) tracks.push(motorSfxTrack)

  const transmissionSfxTrack = buildTransmissionGearSfxTrack(captionBlocksToRender, totalDuration, jobId)
  if (transmissionSfxTrack) tracks.push(transmissionSfxTrack)

  const highlightSfxTrack = buildHighlightSfxTrack(captionBlocksToRender, totalDuration, jobId)
  if (highlightSfxTrack) tracks.push(highlightSfxTrack)

  const whooshSfxTrack = buildClipTransitionWhooshTrack(sequence, jobId)
  if (whooshSfxTrack) tracks.push(whooshSfxTrack)

  const brandPopSfxTrack = buildBrandTitlePopSfxTrack(brandStart, totalDuration, hasBrandOverlays, jobId)
  if (brandPopSfxTrack) tracks.push(brandPopSfxTrack)

  const comentaSfxTrack = buildComentaMentionSfxTrack(opts?.comentaMentionTimeSec, totalDuration, jobId)
  if (comentaSfxTrack) tracks.push(comentaSfxTrack)

  const callbackUrl = `${callbackBase}/api/videos/webhook/shotstack?jobId=${encodeURIComponent(jobId)}`
  const edit = {
    timeline: {
      tracks,
      fonts: buildTimelineFonts(),
    },
    output: {
      format: 'mp4',
      size: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
      fps: 30,
      quality: 'high',
    },
    callback: callbackUrl,
  }

  // ── DEBUG payload completo ─────────────────────────────────────────────
  console.log(
    `[Shotstack][${jobId}] Enviando ${tracks.length} tracks a Shotstack ` +
      `(${sequence.length} clips, ${totalDuration.toFixed(1)}s)`
  )
  tracks.forEach((t, i) => {
    const types = (t.clips ?? []).map((c) => {
      const a = c.asset as Record<string, unknown>
      return `${a.type ?? '?'}@t${(c.start as number)?.toFixed(2) ?? '?'}s`
    })
    console.log(`[Shotstack][${jobId}]   track[${i}]: ${types.join(', ')}`)
  })
  const payloadJson = JSON.stringify(edit)
  console.log(
    `[Shotstack][${jobId}] Payload size: ${payloadJson.length} bytes — snippet: ${payloadJson.slice(0, 300)}`
  )

  const renderId = await postShotstackRender(apiKey, baseUrl, edit)

  try {
    const supabase = getServiceClient()
    const { error } = await supabase
      .from('video_jobs_v2')
      .update({ creatomate_render_id: renderId })
      .eq('id', jobId)
    if (error) {
      console.warn(`[Shotstack][${jobId}] No se pudo guardar creatomate_render_id: ${error.message}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[Shotstack][${jobId}] No se pudo guardar creatomate_render_id: ${msg}`)
  }

  console.log(`[VideoV2Pipeline][${jobId}][Shotstack] Render encolado. ID=${renderId}`)
  return renderId
}

export async function getShotstackRenderStatus(
  renderId: string
): Promise<{ status: string; url?: string; error?: string }> {
  const { apiKey, baseUrl } = assertShotstackEnv()
  const statusUrl = `${baseUrl}/${renderId}`
  const res = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shotstack status HTTP ${res.status}: ${text}`)
  }
  const json = await res.json()
  return {
    status: json?.response?.status ?? 'unknown',
    url: json?.response?.url ?? undefined,
    error: json?.response?.error ?? undefined,
  }
}
