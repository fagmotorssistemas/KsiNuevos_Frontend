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

const RAW_BUCKET = 'raw-videos-v2'

const MONTSERRAT_BLACK_TTF =
  'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@5.2.5/latin-900-normal.ttf'

const CLOSING_LOGO_LEN_SEC = 3.5
const DEFAULT_CLOSING_LOGO_PATH = '/logol.png'
const CLOSING_LOGO_WIDTH_PX = 290
const CLOSING_LOGO_HEIGHT_PX = 40
const CLOSING_LOGO_ENTRANCE_SEC = 0.45

function buildTimelineFonts(): { src: string }[] {
  return [{ src: MONTSERRAT_BLACK_TTF }]
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

function buildVideoTrack(sequence: SequenceItem[], clipUrls: string[]): ShotstackTrack {
  const starts = computeLinearStarts(sequence)
  const clips: ShotstackClip[] = []
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]!
    const src = clipUrls[item.clip_index] ?? clipUrls[0]
    clips.push({
      asset: {
        type: 'video',
        src,
        trim: Number(item.trim_start.toFixed(3)),
        volume: 1,
      },
      start: starts[i],
      length: Number(item.trim_duration.toFixed(3)),
      fit: 'cover',
      effect: 'zoomIn',
    })
  }
  return { clips }
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
 *   L2 (modelo,  96px, rojo)   — position:'top', debajo de L1
 *   L3 (tagline, 52px, blanco) — position:'top', debajo de L2  (si existe)
 *   L4 (año,     84px, blanco) — position:'center', zona inferior
 *
 * L2 se trunca a las dos primeras palabras.
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
  const line2Raw = (brandConfig.vehicle_line_2?.trim() || '').split(/\s+/).slice(0, 2).join(' ')
  const line2 = cleanVehicleText(line2Raw)
  const line3 = cleanVehicleText(brandConfig.vehicle_line_3?.trim() || '')
  const line4 = cleanVehicleText(brandConfig.vehicle_line_4?.trim() || '')
  const cta   = brandConfig.cta_text?.trim() || ''
  const wa    = brandConfig.whatsapp_number?.trim() || ''

  const introLen = Number(Math.min(brandLength, totalDuration - brandStart).toFixed(3))

  const brandStyle = { textTransform: 'uppercase' }
  const brandAlign = { horizontal: 'center', vertical: 'middle' }

  // Tamaño dinámico de L2 según cantidad de palabras
  const line2Words = line2 ? line2.split(/\s+/).length : 0
  const l2RealSize = line2Words <= 1 ? 96 : line2Words === 2 ? 80 : 64

  // Sombra difusa simulada con blur:30 (rich-text beta)
  const shadowEffect = { offsetX: 0, offsetY: 0, blur: 30, color: '#000000', opacity: 1 }

  const bs = Number(brandStart.toFixed(3))

  /**
   * Genera keyframes de "salto rápido al entrar, luego fijo".
   * 3 oscilaciones de amplitud decreciente en ~0.24s, después posición fija.
   */
  // ── L1: MARCA (blanco, 52px) ─────────────────────────────────────────
  if (line1) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line1.toUpperCase(),
          font:   { family: 'Montserrat', size: 52, weight: 900, color: '#FFFFFF', opacity: 1 },
          stroke: { width: 1, color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 700, height: 90,
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.08, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line1.toUpperCase(),
          font:   { family: 'Montserrat', size: 52, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: 14, color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 760, height: 120,
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
          stroke: { width: 2, color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 700, height: 140,
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
          stroke: { width: 18, color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 760, height: 180,
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.13, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── L3: TAGLINE (blanco, 52px) — solo si existe ───────────────────────
  if (line3) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line3.toUpperCase(),
          font:   { family: 'Montserrat', size: 52, weight: 900, color: '#FFFFFF', opacity: 1 },
          stroke: { width: 4, color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 700, height: 90,
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.25, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line3.toUpperCase(),
          font:   { family: 'Montserrat', size: 52, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: 14, color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 760, height: 130,
        position: 'top', offset: { x: 0, y: buildJumpThenFixed(-0.25, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── L4: AÑO (blanco, 84px) — zona inferior ────────────────────────────
  if (line4) {
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line4.toUpperCase(),
          font:   { family: 'Montserrat', size: 84, weight: 900, color: '#FFFFFF', opacity: 1 },
          stroke: { width: 5, color: '#000000', opacity: 1 },
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 400, height: 120,
        position: 'center', offset: { x: 0, y: buildJumpThenFixed(-0.22, introLen) },
        transition: { out: 'fade' },
      }],
    })
    tracks.push({
      clips: [{
        asset: {
          type: 'rich-text',
          text: line4.toUpperCase(),
          font:   { family: 'Montserrat', size: 84, weight: 900, color: '#000000', opacity: 0.2 },
          stroke: { width: 16, color: '#000000', opacity: 1 },
          shadow: shadowEffect,
          style:  brandStyle,
          align:  brandAlign,
        },
        start: bs, length: introLen,
        width: 480, height: 170,
        position: 'center', offset: { x: 0, y: buildJumpThenFixed(-0.22, introLen) },
        transition: { out: 'fade' },
      }],
    })
  }

  // ── CTA (opcional) ────────────────────────────────────────────────────
  if (cta) {
    const FRAME_H = 1280
    const ctaH = 160
    // Centrado en la parte superior del frame, aparece tarde en el reel
    const ctaOffsetY = Number(((ctaH / 2 + 40) / FRAME_H).toFixed(3)) // ≈ 0.094
    const timeStart = totalDuration >= 10 ? Math.max(0, totalDuration - 8) : 2
    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html:
              `<div style="background:#CC0000;border-radius:25px;padding:18px 35px;` +
              `font-family:'Montserrat',sans-serif;font-weight:900;font-size:55px;` +
              `color:#FFFFFF;text-transform:uppercase;text-align:center;line-height:1.2;">` +
              `${htmlEscape(cta)}</div>`,
            width: 580,
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
    const timeStart = totalDuration >= 8 ? Math.max(0, totalDuration - 6) : 2
    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html:
              `<div style="background:#CC0000;border-radius:18px;padding:12px 25px;` +
              `font-family:'Montserrat',sans-serif;color:#FFFFFF;text-align:center;` +
              `display:flex;flex-direction:column;align-items:center;">\n` +
              `<span style="font-size:28px;font-weight:700;letter-spacing:2px;">WHATSAPP</span>\n` +
              `<span style="font-size:52px;font-weight:900;letter-spacing:1px;">${htmlEscape(wa)}</span>\n` +
              `</div>`,
            width: 660,
            height: 140,
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

/**
 * Calcula el font-size para el subtítulo según el texto.
 *
 * Montserrat Black: ~0.68em por carácter (mayúsculas).
 * Objetivo: que la línea CSS más larga (greedy word-wrap) quepa en 680px,
 * y que haya ≤ 2 líneas en total.
 *
 * Frame 720px, padding 20px → ancho útil 680px.
 */
function captionFontSize(text: string): number {
  const USEFUL_W = 680
  const EM = 0.68

  const words = text.trim().split(/\s+/)

  // Simula el greedy word-wrap CSS para calcular la línea más larga.
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

  // Búsqueda binaria: mayor fontSize donde longestLine ≤ USEFUL_W y lines ≤ 2.
  let lo = 36, hi = 75, best = 36
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)

    // Contar líneas y comprobar que la más ancha quepa
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

  function captionRealSize(text: string): number {
    const len = text.length
    if (len <= 8) return 80
    if (len <= 14) return 72
    if (len <= 20) return 60
    return 48
  }

  const captionShadowEffect = { offsetX: 0, offsetY: 0, blur: 30, color: '#000000', opacity: 1 }

  // Posición alterna: par → abajo (y: 0.15), impar → arriba/centro (y: 0.70)
  const captionPositionY = (idx: number) => (idx % 2 === 0 ? 0.15 : 0.70)

  // Palabras técnicas del vehículo que reciben animación de ola
  const TECH_SPEC_RE = /\b(MOTOR|TRANSMIS|MANUAL|AUTOM[AÁ]T|TURBO|D[IÍ]ESEL|GASOLINA|TURBO|HP|CV|CC|\d+[\.,]\d+|\d{4}CC)\b/i

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

  // Detecta si un bloque tiene exactamente 2 palabras largas (ambas >= 5 chars)
  function isLongPair(text: string): boolean {
    const words = text.trim().split(/\s+/)
    return words.length === 2 && words.every(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 5)
  }

  function longPairFontSize(word: string): number {
    const len = word.length
    if (len <= 6)  return 88
    if (len <= 9)  return 78
    if (len <= 12) return 68
    return 58
  }

  const regularBlocks = validBlocks.filter(b => !isLongPair(b.text.trim().toUpperCase()))
  const longPairBlocks = validBlocks.filter(b => isLongPair(b.text.trim().toUpperCase()))

  // CAPA 2 (texto real) — blanco, sin transition para que aparezca instantáneamente
  const realClips: ShotstackClip[] = regularBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = captionRealSize(text)
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
      width: 700, height: 200,
      position: 'bottom', offset: { x: 0, y: captionOffsetY(text, idx, b.duration) },
    }
  })

  // CAPA 1 (sombra) — misma posición alterna que la capa real
  const shadowClips: ShotstackClip[] = regularBlocks.map((b, idx) => {
    const text = b.text.trim().toUpperCase()
    const sz = captionRealSize(text)
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
      width: 700, height: 200,
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
      width: 680, height: 180,
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
      width: 680, height: 180,
      position: 'bottom',
      offset: { x: 0.10, y: isTransmisionPair ? buildJumpThenFixed(y2, length) : y2 },
    })
  }

  const tracks: ShotstackTrack[] = [{ clips: realClips }, { clips: shadowClips }]
  if (lpWord1Clips.length > 0) {
    tracks.push({ clips: lpWord1Clips })
    tracks.push({ clips: lpWord2Clips })
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

  const hasBrandOverlays =
    opts?.brandConfig?.show_brand_overlays === true &&
    (opts.brandConfig.vehicle_line_1?.trim() || opts.brandConfig.vehicle_line_2?.trim())

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
  tracks.push(buildVideoTrack(sequence, clipUrls))

  const musicTrim = opts?.musicTrimStartSecOverride ?? 0
  const musicTrack = buildMusicTrack(musicUrl, totalDuration, musicTrim)
  if (musicTrack) tracks.push(musicTrack)

  const callbackUrl = `${callbackBase}/api/videos/webhook/shotstack?jobId=${encodeURIComponent(jobId)}`
  const edit = {
    timeline: {
      tracks,
      fonts: buildTimelineFonts(),
    },
    output: {
      format: 'mp4',
      size: { width: 720, height: 1280 },
      fps: 30,
      quality: 'medium',
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
