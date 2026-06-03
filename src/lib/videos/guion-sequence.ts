import { dialogueLinesFromGuionEscenas, type GuionEscena } from '@/types/video-script'
import { jaccardSimilarity } from './subtitle-screen-text'
import type { Segment, SequenceItem } from './segmenter'

/** Umbral ideal; por debajo se acepta el mejor candidato si supera MIN_DIALOGUE_SEGMENT_MATCH_FALLBACK. */
const MIN_DIALOGUE_SEGMENT_MATCH = 0.14
const MIN_DIALOGUE_SEGMENT_MATCH_FALLBACK = 0.06

function segmentTranscriptText(seg: Segment): string {
  const base = seg.text?.trim() ?? ''
  const words = seg.words?.length ? seg.words.map((w) => w.text).join(' ') : ''
  return `${base} ${words}`.replace(/\s+/g, ' ').trim()
}

/** Tabla de similitud diálogo (guión) × segmento (Assembly) para depuración. */
export function logGuionDialogueMatchMatrix(
  escenas: GuionEscena[],
  allSegments: Segment[],
  jobId: string,
  excludedClipIndices: number[] = []
): void {
  const dialogues = dialogueLinesFromGuionEscenas(escenas)
  const excluded = new Set(excludedClipIndices)
  const spoken = allSegments.filter(
    (s) => s.source_kind !== 'visual_only' && !excluded.has(s.clip_index)
  )
  console.log(
    `[GuionSequence][${jobId}] DEBUG matriz: ${dialogues.length} diálogos guión × ${spoken.length} segmentos Assembly`
  )
  for (let i = 0; i < dialogues.length; i++) {
    const line = dialogues[i]!
    const scores = spoken
      .map((seg) => {
        const full = segmentTranscriptText(seg)
        const score = Math.max(jaccardSimilarity(line, seg.text ?? ''), jaccardSimilarity(line, full))
        return { id: seg.segment_id, clip: seg.clip_index, score, preview: (seg.text ?? '').slice(0, 48) }
      })
      .sort((a, b) => b.score - a.score)
    const top = scores.slice(0, 3).map((s) => `${s.id}(clip${s.clip},${s.score.toFixed(3)}):"${s.preview}"`)
    console.log(`[GuionSequence][${jobId}]   escena ${i + 1} guión: "${line.slice(0, 64)}${line.length > 64 ? '…' : ''}" → ${top.join(' | ')}`)
  }
  for (const seg of spoken) {
    console.log(
      `[GuionSequence][${jobId}]   Assembly clip${seg.clip_index} ${seg.segment_id}: "${segmentTranscriptText(seg).slice(0, 72)}${segmentTranscriptText(seg).length > 72 ? '…' : ''}"`
    )
  }
}

function sequenceItemFromSegment(seg: Segment, order: number, reason: string): SequenceItem {
  return {
    segment_id: seg.segment_id,
    clip_index: seg.clip_index,
    trim_start: seg.start_s,
    trim_end: seg.end_s,
    trim_duration: seg.duration_s,
    order,
    reason,
  }
}

/**
 * Montaje determinista: una escena de guión → un segment_id, en orden de diálogo.
 * Devuelve null si alguna línea no encuentra match suficiente en Assembly.
 */
export function tryBuildSequenceFromGuionDialogues(
  escenas: GuionEscena[],
  allSegments: Segment[],
  opts?: { excludedClipIndices?: number[]; jobId?: string }
): SequenceItem[] | null {
  const dialogues = dialogueLinesFromGuionEscenas(escenas)
  if (dialogues.length === 0) {
    if (opts?.jobId) {
      console.warn(`[GuionSequence][${opts?.jobId}] Sin diálogos en guion_escenas (columna DIÁLOGO / VOZ EN OFF vacía)`)
    }
    return null
  }

  const excluded = new Set(opts?.excludedClipIndices ?? [])
  const spoken = allSegments.filter(
    (s) => s.source_kind !== 'visual_only' && !excluded.has(s.clip_index) && !isMistakeLike(s.text)
  )
  if (spoken.length === 0) return null

  if (opts?.jobId) {
    logGuionDialogueMatchMatrix(escenas, allSegments, opts.jobId, opts.excludedClipIndices)
  }

  const used = new Set<string>()
  const sequence: SequenceItem[] = []
  let weakMatches = 0

  for (let i = 0; i < dialogues.length; i++) {
    const line = dialogues[i]!
    let best: Segment | null = null
    let bestScore = -1

    for (const seg of spoken) {
      if (used.has(seg.segment_id)) continue
      const segFull = segmentTranscriptText(seg)
      const score = Math.max(
        jaccardSimilarity(line, seg.text ?? ''),
        jaccardSimilarity(line, segFull)
      )
      if (score > bestScore) {
        bestScore = score
        best = seg
      }
    }

    if (!best || bestScore < MIN_DIALOGUE_SEGMENT_MATCH_FALLBACK) {
      if (opts?.jobId) {
        console.warn(
          `[GuionSequence][${opts.jobId}] FALLO diálogo ${i + 1}/${dialogues.length} (mejor score=${bestScore.toFixed(3)}): "${line.slice(0, 72)}…" — se usará Gemini`
        )
      }
      return null
    }

    if (bestScore < MIN_DIALOGUE_SEGMENT_MATCH) {
      weakMatches++
      if (opts?.jobId) {
        console.warn(
          `[GuionSequence][${opts.jobId}] Match débil escena ${i + 1}: score=${bestScore.toFixed(3)} → ${best.segment_id} (clip ${best.clip_index})`
        )
      }
    }

    used.add(best.segment_id)
    sequence.push(
      sequenceItemFromSegment(
        best,
        i + 1,
        `guión escena ${i + 1}: ${line.slice(0, 80)}${line.length > 80 ? '…' : ''}`
      )
    )
  }

  if (opts?.jobId) {
    console.log(
      `[GuionSequence][${opts.jobId}] OK secuencia por guión (${sequence.length}/${dialogues.length} cortes, ${weakMatches} match débil): ` +
        sequence.map((s) => `${s.segment_id}(clip${s.clip_index})`).join(' → ')
    )
  }

  return sequence
}

function isMistakeLike(text: string): boolean {
  const t = text.toLowerCase()
  return /\b(me equivoqu|otra vez|de nuevo|perdón|disculp)\b/i.test(t)
}

export function sequenceDurationSec(sequence: SequenceItem[]): number {
  return Number(sequence.reduce((acc, it) => acc + it.trim_duration, 0).toFixed(3))
}
