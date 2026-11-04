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

// ─── Layout con bloque de voz en off ──────────────────────────────────────────

/** Dónde va el bloque de voz en off: después de `insertAfterSegmentCount` cortes de la secuencia. */
export interface ReelVoiceOverSlot {
  insertAfterSegmentCount: number
  voDurationSec: number
}

/**
 * Tramo de cortes seguidos. Cada tramo se arma como un mini-Reel (sus propias transiciones y
 * solapes, el último corte alargado para cubrirlos) que empieza en `offsetSec`.
 */
export interface ReelPart {
  sequence: SequenceItem[]
  /** Índice en la secuencia completa del primer corte del tramo. */
  firstIndex: number
  offsetSec: number
}

export interface ReelLayout {
  parts: ReelPart[]
  voiceOver: { startSec: number; durationSec: number } | null
  totalDurationSec: number
  /** Inicio en el Reel de cada corte de la secuencia (mismo índice). */
  cutStartSec: number[]
}

/** Suma lineal de duraciones; mismo redondeo que `sumSequenceItemsDurationSec` de segmenter.ts. */
function linearDurationSec(sequence: SequenceItem[]): number {
  return Number(sequence.reduce((acc, item) => acc + item.trim_duration, 0).toFixed(3))
}

/**
 * Ubica los cortes en el Reel. Sin voz en off hay un solo tramo (tiempos de siempre). Con voz en off:
 * cortes de antes → bloque de voz → cortes de después, igual que arma los subtítulos el pipeline
 * (`computeAutomaticSubtitlePayload`): la voz empieza en la suma lineal de los cortes de antes y los
 * de después se corren esa suma más la duración de la voz.
 */
export function buildReelLayout(sequence: SequenceItem[], voiceOver?: ReelVoiceOverSlot | null): ReelLayout {
  if (!voiceOver) {
    return {
      parts: sequence.length > 0 ? [{ sequence, firstIndex: 0, offsetSec: 0 }] : [],
      voiceOver: null,
      totalDurationSec: linearDurationSec(sequence),
      cutStartSec: sequence.map((_, i) => computeReelClipStartSec(sequence, i)),
    }
  }

  const ins = Math.max(0, Math.min(Math.trunc(voiceOver.insertAfterSegmentCount), sequence.length))
  const before = sequence.slice(0, ins)
  const after = sequence.slice(ins)
  const voStart = linearDurationSec(before)
  const voDur = Math.max(0, voiceOver.voDurationSec)
  const afterOffset = Number((voStart + voDur).toFixed(3))

  const parts: ReelPart[] = []
  if (before.length > 0) parts.push({ sequence: before, firstIndex: 0, offsetSec: 0 })
  if (after.length > 0) parts.push({ sequence: after, firstIndex: ins, offsetSec: afterOffset })

  const cutStartSec = parts.flatMap((p) =>
    p.sequence.map((_, i) => Number((p.offsetSec + computeReelClipStartSec(p.sequence, i)).toFixed(3)))
  )
  return {
    parts,
    voiceOver: voDur > 0 ? { startSec: voStart, durationSec: Number(voDur.toFixed(3)) } : null,
    totalDurationSec: Number((afterOffset + linearDurationSec(after)).toFixed(3)),
    cutStartSec,
  }
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
