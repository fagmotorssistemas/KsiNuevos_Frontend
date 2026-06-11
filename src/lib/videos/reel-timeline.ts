import type { SequenceItem } from './segmenter'

/** Debe coincidir con `CLIP_TRANSITION_OVERLAP_SEC` en shotstack.ts */
export const CLIP_TRANSITION_OVERLAP_SEC = 0.5

/** Índices de corte con transición (*Fast ≈ 0.5 s de solapamiento) */
export const CLIP_BOUNDARY_INDICES = [0, 1, 4] as const

export function countClipTransitionOverlapsBefore(
  clipIndex: number,
  sequenceLength: number
): number {
  let n = 0
  for (const boundary of CLIP_BOUNDARY_INDICES) {
    if (clipIndex > boundary && boundary + 1 < sequenceLength) n++
  }
  return n
}

/** Inicio del clip `clipIndex` en la timeline del Reel (resta solapamientos de transición). */
export function computeReelClipStartSec(sequence: SequenceItem[], clipIndex: number): number {
  let linearSec = 0
  for (let i = 0; i < clipIndex; i++) {
    linearSec += sequence[i]!.trim_duration
  }
  const overlapSec =
    CLIP_TRANSITION_OVERLAP_SEC * countClipTransitionOverlapsBefore(clipIndex, sequence.length)
  return Number(Math.max(0, linearSec - overlapSec).toFixed(3))
}

export function computeReelClipStartMs(sequence: SequenceItem[], clipIndex: number): number {
  return Number((computeReelClipStartSec(sequence, clipIndex) * 1000).toFixed(3))
}
