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
const CLOSING_LOGO_WIDTH_PX = 280
const CLOSING_LOGO_HEIGHT_PX = 32
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

/**
 * Construye el bloque de overlays de marca.
 *
 * Sistema de coordenadas Shotstack (frame 720×1280):
 *   position:'top'    + offset.y positivo → empuja el clip HACIA ABAJO (dentro del frame).
 *   position:'bottom' + offset.y positivo → empuja el clip HACIA ARRIBA (dentro del frame).
 *   offset normalizado: 1.0 = dimensión completa del frame.
 *
 * L1 (marca,  52 px, blanco) ─┐
 * L2 (modelo,100 px, rojo)    ├─ bloque único arriba · 3.5 s
 * L3 (tagline,52 px, blanco) ─┘
 * L4 (año,    72 px, rojo)      anclado abajo todo el reel
 */
function buildBrandOverlayTracks(
  brandConfig: BrandConfig | null | undefined,
  totalDuration: number
): ShotstackTrack[] {
  if (!brandConfig?.show_brand_overlays) return []

  const tracks: ShotstackTrack[] = []
  const line1 = brandConfig.vehicle_line_1?.trim() || ''
  const line2 = brandConfig.vehicle_line_2?.trim() || ''
  const line3 = brandConfig.vehicle_line_3?.trim() || ''
  const line4 = brandConfig.vehicle_line_4?.trim() || ''
  const cta   = brandConfig.cta_text?.trim() || ''
  const wa    = brandConfig.whatsapp_number?.trim() || ''

  // Altura de frame de salida (px)
  const FRAME_H = 1280

  const fontBase =
    "font-family:'Montserrat',sans-serif;font-weight:900;" +
    'text-transform:uppercase;text-align:center;margin:0;padding:0;'

  // ── BLOQUE SUPERIOR: L1 / L2 / L3 agrupados ──────────────────────────
  // Alturas aproximadas de cada línea renderizada (px)
  const H_SM  = 64   // texto 52 px, line-height 1.1 → ~57 px + holgura
  const H_LG  = 118  // texto 100 px, line-height 1.05 → ~105 px + holgura
  const GAP   = 6    // separación vertical entre líneas (px)
  const PAD_V = 20   // padding arriba + abajo del contenedor (px)

  const topParts: string[] = []
  let blockH = PAD_V

  if (line1) {
    if (topParts.length > 0) blockH += GAP
    blockH += H_SM
    topParts.push(
      `<p style="${fontBase}font-size:52px;color:#FFFFFF;` +
      `-webkit-text-stroke:2px #000000;text-shadow:2px 2px 6px rgba(0,0,0,0.9);` +
      `line-height:1.1;">${htmlEscape(line1.toUpperCase())}</p>`
    )
  }
  if (line2) {
    if (topParts.length > 0) blockH += GAP
    blockH += H_LG
    topParts.push(
      `<p style="${fontBase}font-size:100px;color:#E63333;` +
      `-webkit-text-stroke:3px #000000;text-shadow:2px 2px 8px rgba(0,0,0,0.95);` +
      `line-height:1.05;">${htmlEscape(line2.toUpperCase())}</p>`
    )
  }
  if (line3) {
    if (topParts.length > 0) blockH += GAP
    blockH += H_SM
    topParts.push(
      `<p style="${fontBase}font-size:52px;color:#FFFFFF;` +
      `-webkit-text-stroke:2px #000000;text-shadow:2px 2px 6px rgba(0,0,0,0.9);` +
      `line-height:1.1;">${htmlEscape(line3.toUpperCase())}</p>`
    )
  }

  if (topParts.length > 0) {
    blockH = Math.max(blockH, 80)

    // Para position:'top', offset.y positivo empuja hacia abajo.
    // Queremos que el borde superior del bloque quede ~0 px del borde superior del frame.
    // → centro del bloque a blockH/2 px desde arriba → offset = (blockH/2) / FRAME_H
    const offsetY = Number(((blockH / 2) / FRAME_H).toFixed(3))

    const html =
      `<div style="display:flex;flex-direction:column;align-items:center;` +
      `justify-content:center;gap:${GAP}px;padding:10px;box-sizing:border-box;">` +
      topParts.join('') +
      '</div>'

    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html,
            width: 700,
            height: blockH,
            background: 'transparent',
            css: 'p{margin:0;}',
          },
          start: 0,
          length: Number(Math.min(3.5, totalDuration).toFixed(3)),
          position: 'top',
          offset: { x: 0, y: offsetY },
          transition: { in: 'slideDown', out: 'fade' },
        },
      ],
    })
  }

  // ── L4: AÑO — toda la duración, pegado al fondo ───────────────────────
  // El logo cierre tiene su centro ~61 px desde el fondo (offset 0.048).
  // L4 se coloca encima: centro a ~140 px desde el fondo.
  if (line4) {
    const l4H = 100
    const l4OffsetY = Number(((l4H / 2 + 90) / FRAME_H).toFixed(3)) // ≈ 0.109
    tracks.push({
      clips: [
        {
          asset: {
            type: 'html',
            html:
              `<p style="${fontBase}font-size:72px;color:#E63333;` +
              `-webkit-text-stroke:3px #000000;text-shadow:2px 2px 8px rgba(0,0,0,0.9);` +
              `line-height:1.1;">${htmlEscape(line4.toUpperCase())}</p>`,
            width: 400,
            height: l4H,
            background: 'transparent',
            css: 'p{margin:0;}',
          },
          start: 0,
          length: Number(totalDuration.toFixed(3)),
          position: 'bottom',
          offset: { x: 0, y: l4OffsetY },
          transition: { in: 'fade', out: 'fade' },
        },
      ],
    })
  }

  // ── CTA (opcional) ────────────────────────────────────────────────────
  if (cta) {
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
              from: 0.12,
              to: 0.048,
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

/** Elimina subtítulos cuyo inicio cae dentro del bloque anterior (evita texto amontonado en Shotstack). */
function dropOverlappingSubtitleBlocks(blocks: SubtitleBlock[], jobId: string): SubtitleBlock[] {
  const sorted = [...blocks]
    .filter((b) => b.text?.trim() && b.duration > 0.01)
    .sort((a, b) => a.time - b.time)
  const out: SubtitleBlock[] = []
  for (const b of sorted) {
    const prev = out[out.length - 1]
    if (prev && b.time < prev.time + prev.duration - 0.08) {
      console.warn(
        `[Shotstack][${jobId}] Subtítulo solapado omitido t=${b.time.toFixed(2)}s ` +
          `(prev termina ${(prev.time + prev.duration).toFixed(2)}s): "${b.text.trim().slice(0, 40)}…"`
      )
      continue
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
  const clips: ShotstackClip[] = safe
    .filter((b) => b.text?.trim() && b.duration > 0.01)
    .map((b) => {
      const text = b.text.trim().toUpperCase()
      const fontSize = captionFontSize(text)
      // A mayor font, más altura necesaria; a menor, menos.
      const lineH = Math.ceil(fontSize * 1.15)
      const boxH = lineH * 2 + 30 // máx 2 líneas + holgura
      return {
        asset: {
          type: 'html',
          html:
            `<p style="` +
            `font-family:'Montserrat',sans-serif;` +
            `font-weight:900;` +
            `font-size:${fontSize}px;` +
            `color:#FFFFFF;` +
            `-webkit-text-stroke:${fontSize >= 60 ? 6 : 4}px #000000;` +
            `text-transform:uppercase;` +
            `text-align:center;` +
            `margin:0;` +
            `padding:0 12px;` +
            `line-height:1.15;` +
            `letter-spacing:-0.5px;` +
            `word-break:break-word;` +
            `">${htmlEscape(text)}</p>`,
          width: 700,
          height: boxH,
          background: 'transparent',
          css: 'p{margin:0;}',
        },
        start: Number(b.time.toFixed(3)),
        length: Number(b.duration.toFixed(3)),
        position: 'bottom',
        offset: { x: 0, y: 0.35 },
        transition: { in: 'fade', out: 'fade' },
      }
    })

  return clips.length > 0 ? [{ clips }] : []
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
  opts?: { musicTrimStartSecOverride?: number; brandConfig?: BrandConfig | null }
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

  tracks.push(...buildCaptionHtmlTracks(subtitleBlocks, totalDuration, jobId))
  const captionCount = subtitleBlocks.filter((b) => b.text?.trim() && b.duration > 0.01).length
  if (captionCount > 0) {
    const safe = dropOverlappingSubtitleBlocks(subtitleBlocks, jobId)
    console.log(`[Shotstack][${jobId}] Subtítulos HTML (${safe.length} frases, sin solapar)`)
    for (const b of safe) {
      console.log(
        `[Shotstack][${jobId}]   caption t=${b.time.toFixed(2)}s +${b.duration.toFixed(2)}s ` +
          `"${b.text.trim().slice(0, 50)}${b.text.length > 50 ? '…' : ''}"`
      )
    }
  }

  const brandOverlayTracks = buildBrandOverlayTracks(opts?.brandConfig ?? null, totalDuration)
  if (brandOverlayTracks.length > 0) {
    const bc = opts?.brandConfig
    console.log(
      `[Shotstack][${jobId}] Brand overlays: L1="${bc?.vehicle_line_1 ?? ''}" ` +
        `L2="${bc?.vehicle_line_2 ?? ''}" L3="${bc?.vehicle_line_3 ?? ''}" ` +
        `L4="${bc?.vehicle_line_4 ?? ''}" (${brandOverlayTracks.length} tracks)`
    )
  } else {
    console.log(`[Shotstack][${jobId}] Brand overlays: desactivados (show_brand_overlays=false o sin líneas)`)
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
