/**
 * Captions V1 — alterna Y, olas, pares largos, sparkles, Montserrat.
 * Lógica idéntica a la que vivía en shotstack.ts (solo movida).
 */

import type { SubtitleBlock } from './segmenter'
import { isDriveBadgeText } from './drive-badge'
import {
  s720,
  overlayCaptionFontSize,
  longPairFontSize,
  buildJumpThenFixed,
  dropOverlappingSubtitleBlocks,
  type ShotstackClip,
  type ShotstackTrack,
} from './shotstack-captions-shared'
export function buildCaptionHtmlTracks(
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
