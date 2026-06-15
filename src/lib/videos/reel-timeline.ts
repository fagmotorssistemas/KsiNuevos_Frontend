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

/** Escenas 0–2 del guión usan timeline lineal (igual que subtitle-screen-text). */
export const GUION_SUBTITLE_LINEAR_UNTIL_SEQ_INDEX = 3

export interface SequenceTimelineRange {
  seqIndex: number
  clipIndex: number
  startSec: number
  endSec: number
}

/** Rangos [start, end) por ítem de secuencia → clip de origen (archivo subido). */
export function buildSequenceTimelineRanges(
  sequence: SequenceItem[],
  opts?: { guionSubtitleTimeline?: boolean }
): SequenceTimelineRange[] {
  const ranges: SequenceTimelineRange[] = []
  let linearMs = 0

  for (let si = 0; si < sequence.length; si++) {
    const item = sequence[si]!
    const durSec = item.trim_duration
    const startSec = opts?.guionSubtitleTimeline
      ? si < GUION_SUBTITLE_LINEAR_UNTIL_SEQ_INDEX
        ? linearMs / 1000
        : computeReelClipStartSec(sequence, si)
      : computeReelClipStartSec(sequence, si)
    const endSec = Number((startSec + durSec).toFixed(3))

    ranges.push({
      seqIndex: si,
      clipIndex: item.clip_index,
      startSec: Number(startSec.toFixed(3)),
      endSec,
    })

    linearMs += durSec * 1000
  }

  return ranges
}

export function resolveClipIndexForReelTime(
  timeSec: number,
  ranges: SequenceTimelineRange[]
): number | null {
  for (const r of ranges) {
    if (timeSec >= r.startSec - 0.02 && timeSec < r.endSec + 0.02) {
      return r.clipIndex
    }
  }
  return null
}
