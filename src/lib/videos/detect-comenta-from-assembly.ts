import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import { computeReelClipStartMs } from './reel-timeline'
import { buildComentaOverlayText } from './subtitle-screen-text'

export type ComentaFromAssemblyResult = {
  subtitleBlocks: SubtitleBlock[]
  comentaTimeSec: number | null
  comentaOverlayText: string | null
}

function normalizeWord(text: string): string {
  return text.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

/** Palabras de cierre en voz: "comenta" o "menciona" (overlay sigue siendo COMENTA). */
const COMENTA_CTA_WORDS = ['comenta', 'menciona'] as const
const COMENTA_CTA_TEXT_RE = /\b(?:comenta|menciona)\b/i

function isComentaTriggerWord(text: string): boolean {
  const w = normalizeWord(text).toLowerCase()
  return COMENTA_CTA_WORDS.some((cta) => cta === w)
}

function findComentaTimeInSequence(
  sequence: SequenceItem[],
  allSegments: Segment[]
): number | null {
  const segLookup = new Map<string, Segment>()
  for (const s of allSegments) segLookup.set(s.segment_id, s)

  for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
    const item = sequence[seqIdx]!
    const timelineOffsetMs = computeReelClipStartMs(sequence, seqIdx)
    const seg = segLookup.get(item.segment_id)
    const trimStartMs = item.trim_start * 1000
    const trimEndMs = item.trim_end * 1000

    if (seg?.words?.length) {
      for (const w of seg.words) {
        if (w.start < trimStartMs - 50 || w.end > trimEndMs + 50) continue
        if (isComentaTriggerWord(w.text)) {
          const timeSec = (timelineOffsetMs + (w.start - trimStartMs)) / 1000
          return Number(Math.max(0, timeSec).toFixed(3))
        }
      }
    }
  }

  return null
}

function findComentaTimeInSubtitleBlocks(blocks: SubtitleBlock[]): number | null {
  for (const b of blocks) {
    if (!COMENTA_CTA_TEXT_RE.test(b.text)) continue
    if (b.words?.length) {
      for (const w of b.words) {
        if (isComentaTriggerWord(w.text)) {
          return Number(Math.max(0, w.start).toFixed(3))
        }
      }
    }
    return Number(Math.max(0, b.time).toFixed(3))
  }
  return null
}

function cutSubtitleBlocksAtComenta(
  blocks: SubtitleBlock[],
  comentaTimeSec: number
): SubtitleBlock[] {
  const cutSec = comentaTimeSec - 0.02
  return blocks
    .filter((b) => b.time < cutSec)
    .map((b) => {
      const blockEnd = b.time + b.duration
      if (blockEnd <= cutSec) return b
      return {
        ...b,
        duration: Number(Math.max(0.08, cutSec - b.time).toFixed(3)),
      }
    })
}

/**
 * Modo sin guión: Assembly es el guión. Detecta "comenta" o "menciona" en la transcripción,
 * arma overlay COMENTA + modelo/año y corta subtítiles posteriores.
 */
export function applyComentaFromAssembly(
  blocks: SubtitleBlock[],
  sequence: SequenceItem[],
  allSegments: Segment[],
  opts?: {
    modelLine?: string | null
    yearLine?: string | null
    jobId?: string
  }
): ComentaFromAssemblyResult {
  const comentaTimeSec =
    findComentaTimeInSequence(sequence, allSegments) ??
    findComentaTimeInSubtitleBlocks(blocks)

  if (comentaTimeSec == null) {
    return { subtitleBlocks: blocks, comentaTimeSec: null, comentaOverlayText: null }
  }

  const comentaOverlayText = buildComentaOverlayText(opts?.modelLine, opts?.yearLine)
  const subtitleBlocks = cutSubtitleBlocksAtComenta(blocks, comentaTimeSec)

  if (opts?.jobId) {
    console.log(
      `[ComentaAssembly][${opts.jobId}] COMENTA detectado t=${comentaTimeSec.toFixed(2)}s ` +
        `overlay="${comentaOverlayText}" (${blocks.length} → ${subtitleBlocks.length} subtítulos)`
    )
  }

  return { subtitleBlocks, comentaTimeSec, comentaOverlayText }
}
