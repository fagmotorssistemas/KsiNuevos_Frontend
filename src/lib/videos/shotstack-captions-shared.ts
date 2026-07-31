/**
 * Helpers compartidos para captions Shotstack (V1 / V2).
 * Misma lógica que vivía en shotstack.ts — solo extraída.
 */

import type { SubtitleBlock } from './segmenter'

/** Salida vertical 1080p (9:16). */
export const OUTPUT_WIDTH = 1080
/** Canvas base (720p) donde se calibraron px de overlays y tipografía. */
const DESIGN_WIDTH = 720
const LAYOUT_SCALE = OUTPUT_WIDTH / DESIGN_WIDTH

/** Convierte px definidos en 720p al canvas actual (1080p, factor 1.5×). */
export function s720(px: number): number {
  return Math.round(px * LAYOUT_SCALE)
}

export type ShotstackClip = Record<string, unknown>
export type ShotstackTrack = { clips: ShotstackClip[] }

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Subtítulos y COMENTA: escala calibrada en 720p, aplicada a 1080p. */
export function overlayCaptionFontSize(text: string): number {
  const len = text.length
  if (len <= 8) return s720(80)
  if (len <= 14) return s720(72)
  if (len <= 20) return s720(60)
  return s720(48)
}

export function longPairFontSize(word: string): number {
  const len = word.length
  if (len <= 6) return s720(88)
  if (len <= 9) return s720(78)
  if (len <= 12) return s720(68)
  return s720(58)
}

export function buildJumpThenFixed(baseY: number, totalLen: number): unknown[] {
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

/**
 * Cuando dos subtítulos se solapan, TRUNCA el anterior para que el siguiente pueda aparecer.
 * Nunca descarta ningún subtítulo — solo recorta duración si es necesario.
 */
export function dropOverlappingSubtitleBlocks(
  blocks: SubtitleBlock[],
  jobId: string
): SubtitleBlock[] {
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
