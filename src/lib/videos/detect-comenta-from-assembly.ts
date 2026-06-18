import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import { computeReelClipStartMs } from './reel-timeline'
import { buildComentaOverlayText, normalizeForMatch, wordFuzzyMatches } from './subtitle-screen-text'

export type ComentaFromAssemblyResult = {
  subtitleBlocks: SubtitleBlock[]
  comentaTimeSec: number | null
  comentaOverlayText: string | null
}

/** Palabras de cierre en voz: "comenta" o "menciona" (overlay sigue siendo COMENTA). */
const COMENTA_CTA_WORDS = ['comenta', 'menciona'] as const
const COMENTA_CTA_TEXT_RE = /\b(?:comenta|menciona)\b/i
const MAX_WORDS_AFTER_COMENTA = 3

const AFTER_COMENTA_STOPWORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'es', 'la', 'las', 'le', 'les',
  'lo', 'los', 'me', 'mi', 'no', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'sus',
  'te', 'tu', 'u', 'un', 'una', 'unos', 'unas', 'y', 'ya', 'toda', 'todo',
  'informacion', 'información', 'enviamos', 'envio', 'envío',
])

type ComentaTriggerHit = {
  timeSec: number
  wordsAfter: string[]
}

function normalizeWord(text: string): string {
  return text.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

function isComentaTriggerWord(text: string): boolean {
  const w = normalizeWord(text).toLowerCase()
  return COMENTA_CTA_WORDS.some((cta) => cta === w)
}

function isAfterComentaStopword(word: string): boolean {
  const w = normalizeForMatch(word)
  return !w || AFTER_COMENTA_STOPWORDS.has(w)
}

function collectWordsAfterTrigger(rawWords: { text: string }[], startIndex: number): string[] {
  const out: string[] = []
  for (let i = startIndex + 1; i < rawWords.length; i++) {
    const norm = normalizeForMatch(normalizeWord(rawWords[i]!.text))
    if (!norm) continue
    if (isAfterComentaStopword(norm)) continue
    if (isComentaTriggerWord(norm)) continue
    out.push(norm)
    if (out.length >= MAX_WORDS_AFTER_COMENTA) break
  }
  return out
}

function modelTokensForComentaMatch(modelLine: string): string[] {
  const raw = normalizeForMatch(modelLine).split(' ').filter(Boolean)
  const tokens: string[] = []
  for (const w of raw) {
    if (/^\d{3,4}$/.test(w)) continue
    if (w.length >= 3) tokens.push(w)
    if (tokens.length >= 3) break
  }
  return [...new Set(tokens)]
}

function buildComentaOverlayFromMiddle(
  middleWords: string[],
  yearLine?: string | null
): string {
  const parts = ['COMENTA', ...middleWords.map((w) => w.toUpperCase())]
  const yearRaw = yearLine?.trim() ?? ''
  const yearMatch = yearRaw.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) parts.push(yearMatch[0]!)
  else if (/^\d{4}$/.test(yearRaw)) parts.push(yearRaw)
  return parts.join(' ')
}

function spokenWordMatchesBrand(word: string, brandLine: string): boolean {
  const brandNorm = normalizeForMatch(brandLine)
  if (brandNorm.length < 2) return false
  return wordFuzzyMatches(word, brandNorm)
}

function spokenWordMatchesModel(word: string, modelLine: string): boolean {
  return modelTokensForComentaMatch(modelLine).some((token) => wordFuzzyMatches(word, token))
}

/**
 * Usa las 1–3 palabras tras "comenta" que matcheen marca/modelo del vehículo ya identificado.
 * El año sigue viniendo de inventario (yearLine). Si nada matchea → null (fallback inventario).
 */
function resolveComentaOverlayFromSpeech(
  wordsAfter: string[],
  brandLine: string | null | undefined,
  modelLine: string | null | undefined,
  yearLine: string | null | undefined
): string | null {
  if (wordsAfter.length === 0) return null

  const brand = brandLine?.trim() ?? ''
  const model = modelLine?.trim() ?? ''
  if (!brand && !model) return null

  const matchedMiddle: string[] = []
  const used = new Set<string>()

  for (const word of wordsAfter) {
    let label: string | null = null
    if (brand && spokenWordMatchesBrand(word, brand)) {
      label = word.toUpperCase()
    } else if (model && spokenWordMatchesModel(word, model)) {
      label = word.toUpperCase()
    }
    if (!label) continue
    const key = label.toLowerCase()
    if (used.has(key)) continue
    used.add(key)
    matchedMiddle.push(label)
  }

  if (matchedMiddle.length === 0) return null
  return buildComentaOverlayFromMiddle(matchedMiddle, yearLine)
}

function findComentaHitInSequence(
  sequence: SequenceItem[],
  allSegments: Segment[]
): ComentaTriggerHit | null {
  const segLookup = new Map<string, Segment>()
  for (const s of allSegments) segLookup.set(s.segment_id, s)

  for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
    const item = sequence[seqIdx]!
    const timelineOffsetMs = computeReelClipStartMs(sequence, seqIdx)
    const seg = segLookup.get(item.segment_id)
    const trimStartMs = item.trim_start * 1000
    const trimEndMs = item.trim_end * 1000

    if (!seg?.words?.length) continue

    const inRangeWords = seg.words.filter(
      (w) => w.start >= trimStartMs - 50 && w.end <= trimEndMs + 50
    )

    for (let wi = 0; wi < inRangeWords.length; wi++) {
      const w = inRangeWords[wi]!
      if (!isComentaTriggerWord(w.text)) continue
      const timeSec = Number(
        Math.max(0, (timelineOffsetMs + (w.start - trimStartMs)) / 1000).toFixed(3)
      )
      return {
        timeSec,
        wordsAfter: collectWordsAfterTrigger(inRangeWords, wi),
      }
    }
  }

  return null
}

function findComentaHitInSubtitleBlocks(blocks: SubtitleBlock[]): ComentaTriggerHit | null {
  for (const b of blocks) {
    if (!COMENTA_CTA_TEXT_RE.test(b.text)) continue
    if (b.words?.length) {
      for (let wi = 0; wi < b.words.length; wi++) {
        const w = b.words[wi]!
        if (!isComentaTriggerWord(w.text)) continue
        return {
          timeSec: Number(Math.max(0, w.start).toFixed(3)),
          wordsAfter: collectWordsAfterTrigger(b.words, wi),
        }
      }
    }
    return {
      timeSec: Number(Math.max(0, b.time).toFixed(3)),
      wordsAfter: [],
    }
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
 * overlay COMENTA con lo dicho (marca/modelo del vehículo identificado) + año inventario;
 * si no se reconoce → 1ª palabra modelo inventario + año (comportamiento previo).
 */
export function applyComentaFromAssembly(
  blocks: SubtitleBlock[],
  sequence: SequenceItem[],
  allSegments: Segment[],
  opts?: {
    brandLine?: string | null
    modelLine?: string | null
    yearLine?: string | null
    jobId?: string
  }
): ComentaFromAssemblyResult {
  const hit =
    findComentaHitInSequence(sequence, allSegments) ?? findComentaHitInSubtitleBlocks(blocks)

  if (hit == null) {
    return { subtitleBlocks: blocks, comentaTimeSec: null, comentaOverlayText: null }
  }

  const { timeSec: comentaTimeSec, wordsAfter } = hit
  const fallbackOverlay = buildComentaOverlayText(opts?.modelLine, opts?.yearLine)
  const spokenOverlay = resolveComentaOverlayFromSpeech(
    wordsAfter,
    opts?.brandLine,
    opts?.modelLine,
    opts?.yearLine
  )
  const comentaOverlayText = spokenOverlay ?? fallbackOverlay
  const subtitleBlocks = cutSubtitleBlocksAtComenta(blocks, comentaTimeSec)

  if (opts?.jobId) {
    const source = spokenOverlay ? `voz [${wordsAfter.join(', ')}]` : 'fallback inventario'
    console.log(
      `[ComentaAssembly][${opts.jobId}] COMENTA detectado t=${comentaTimeSec.toFixed(2)}s ` +
        `overlay="${comentaOverlayText}" (${source}) ` +
        `(${blocks.length} → ${subtitleBlocks.length} subtítulos)`
    )
  }

  return { subtitleBlocks, comentaTimeSec, comentaOverlayText }
}
