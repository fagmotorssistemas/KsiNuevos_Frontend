/**
 * Selector de versión de captions Shotstack.
 * Prioridad: override del job (modal) → env VIDEO_CAPTION_STYLE_VERSION → v1.
 */

import type { SubtitleBlock } from './segmenter'
import type { ShotstackTrack } from './shotstack-captions-shared'
import { buildCaptionHtmlTracks } from './shotstack-captions-v1'
import { buildCaptionHtmlTracksV2 } from './shotstack-captions-v2'

/** v1 = alterna / olas / Montserrat. v2 = lineal fijo abajo, karaoke, misma tipografía V1. */
export type CaptionStyleVersion = 'v1' | 'v2'

/**
 * Resuelve la versión de subtítulos.
 * Prioridad: override del job → env (fallback legacy) → v1.
 * El modal siempre envía `captionStyleVersion`; el env solo aplica a jobs viejos sin ese campo.
 */
export function resolveCaptionStyleVersion(
  override?: CaptionStyleVersion | null
): CaptionStyleVersion {
  if (override === 'v1' || override === 'v2') return override
  const fromEnv = process.env.VIDEO_CAPTION_STYLE_VERSION?.trim().toLowerCase()
  if (fromEnv === 'v2') return 'v2'
  return 'v1'
}

/** Construye tracks de captions según versión. Misma lógica; solo elige V1 o V2. */
export function buildCaptionTracks(
  version: CaptionStyleVersion,
  blocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack[] {
  return version === 'v2'
    ? buildCaptionHtmlTracksV2(blocks, totalDuration, jobId)
    : buildCaptionHtmlTracks(blocks, totalDuration, jobId)
}

export { buildCaptionHtmlTracks } from './shotstack-captions-v1'
export { buildCaptionHtmlTracksV2 } from './shotstack-captions-v2'
export {
  dropOverlappingSubtitleBlocks,
  overlayCaptionFontSize,
  s720,
  htmlEscape,
  buildJumpThenFixed,
  longPairFontSize,
  OUTPUT_WIDTH,
} from './shotstack-captions-shared'
export type { ShotstackClip, ShotstackTrack } from './shotstack-captions-shared'