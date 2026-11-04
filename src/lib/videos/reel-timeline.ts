import type { SequenceItem } from './segmenter'

/** Debe coincidir con `CLIP_TRANSITION_OVERLAP_SEC` en shotstack.ts */
export const CLIP_TRANSITION_OVERLAP_SEC = 0.5

/**
 * Cortes con transición de siempre (cortes 1→2, 2→3 y 5→6), para secuencias en que Claude no
 * decidió las transiciones: Reels viejos, Motion 3D y montajes deterministas.
 */
export const CLIP_BOUNDARY_INDICES = [0, 1, 4] as const

/** Una transición solapa los dos cortes 0,5 s: con cortes más cortos que esto no cabe. */
export const MIN_CUT_SEC_FOR_TRANSITION = 1.2
/** Más transiciones que esto cansan; el ritmo lo dan los cortes secos. */
export const MAX_TRANSITIONS_PER_REEL = 4

/** True si Claude marcó en la secuencia qué cortes llevan transición (`transition_after`). */
export function hasDecidedTransitions(sequence: SequenceItem[]): boolean {
  return sequence.some((item) => typeof item.transition_after === 'boolean')
}

/**
 * Índices `i` con transición entre el corte i y el i+1 (cada una solapa CLIP_TRANSITION_OVERLAP_SEC).
 * Los decide Claude con `transition_after`; si la secuencia no los trae, son los de siempre.
 */
export function transitionBoundaries(sequence: SequenceItem[]): number[] {
  const candidates = hasDecidedTransitions(sequence)
    ? sequence.flatMap((item, i) => (item.transition_after === true ? [i] : []))
    : [...CLIP_BOUNDARY_INDICES]
  return candidates.filter((b) => b + 1 < sequence.length)
}

export function countClipTransitionOverlapsBefore(clipIndex: number, sequence: SequenceItem[]): number {
  return transitionBoundaries(sequence).filter((b) => clipIndex > b).length
}

/**
 * Deja válidas las transiciones que eligió Claude: solo entre cortes de al menos
 * MIN_CUT_SEC_FOR_TRANSITION, nunca después del último y como mucho MAX_TRANSITIONS_PER_REEL.
 * Marca todos los cortes (true/false) para que la secuencia siga contando como "decidida".
 * Sin decisión de Claude devuelve la secuencia tal cual (transiciones de siempre).
 *
 * `hardCutAfterIndex`: corte seco obligado después de ese índice (la entrada al bloque de voz en off,
 * que el render arma como tramo aparte), para que no cuente dentro del máximo.
 */
export function normalizeTransitionFlags(
  sequence: SequenceItem[],
  opts?: { hardCutAfterIndex?: number }
): SequenceItem[] {
  if (!hasDecidedTransitions(sequence)) return sequence
  let kept = 0
  return sequence.map((item, i) => {
    const next = sequence[i + 1]
    const ok =
      item.transition_after === true &&
      i !== opts?.hardCutAfterIndex &&
      next != null &&
      item.trim_duration >= MIN_CUT_SEC_FOR_TRANSITION &&
      next.trim_duration >= MIN_CUT_SEC_FOR_TRANSITION &&
      kept < MAX_TRANSITIONS_PER_REEL
    if (ok) kept++
    return { ...item, transition_after: ok }
  })
}

/** Inicio del clip `clipIndex` en la timeline del Reel (resta solapamientos de transición). */
export function computeReelClipStartSec(sequence: SequenceItem[], clipIndex: number): number {
  let linearSec = 0
  for (let i = 0; i < clipIndex; i++) {
    linearSec += sequence[i]!.trim_duration
  }
  const overlapSec = CLIP_TRANSITION_OVERLAP_SEC * countClipTransitionOverlapsBefore(clipIndex, sequence)
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
  opts?: {
    guionSubtitleTimeline?: boolean
    /** Con voz en off, los cortes de después del bloque van corridos (`buildReelLayout`). */
    layout?: ReelLayout
  }
): SequenceTimelineRange[] {
  const ranges: SequenceTimelineRange[] = []
  let linearMs = 0
  const voLayout = opts?.layout?.voiceOver ? opts.layout : null

  for (let si = 0; si < sequence.length; si++) {
    const item = sequence[si]!
    const durSec = item.trim_duration
    const startSec = voLayout
      ? (voLayout.cutStartSec[si] ?? 0)
      : opts?.guionSubtitleTimeline
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
