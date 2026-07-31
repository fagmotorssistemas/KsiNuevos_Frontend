import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import { computeReelClipStartMs } from './reel-timeline'
import {
  buildComentaOverlayText,
  normalizeForMatch,
  wordFuzzyMatches,
} from './subtitle-screen-text'

export type ComentaFromAssemblyResult = {
  subtitleBlocks: SubtitleBlock[]
  comentaTimeSec: number | null
  comentaOverlayText: string | null
}

/**
 * Disparadores en Assembly (voz). El overlay en pantalla siempre muestra "COMENTA".
 * "escribe" cubre ASR que confunde comenta ↔ escribe.
 */
const COMENTA_CTA_WORDS = ['comenta', 'menciona', 'escribe'] as const
const COMENTA_CTA_TEXT_RE = /\b(?:comenta|menciona|escribe)\b/i
const MAX_WORDS_AFTER_COMENTA = 3

/**
 * Temas de voz que NO son marca/modelo. Si dice esto tras el CTA,
 * el overlay es "COMENTA <TEMA>" (sin vehículo ni año).
 */
const COMENTA_TOPIC_CANONICAL: Record<string, string> = {
  financiamiento: 'FINANCIAMIENTO',
  financiacion: 'FINANCIAMIENTO',
  financiamientos: 'FINANCIAMIENTO',
  credito: 'CREDITO',
  créditos: 'CREDITO',
  creditos: 'CREDITO',
  enganche: 'ENGANCHE',
  cuota: 'CUOTA',
  cuotas: 'CUOTAS',
}

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

function spokenWordMatchesBrand(word: string, brandLine: string): boolean {
  const brandNorm = normalizeForMatch(brandLine)
  if (brandNorm.length < 2) return false
  return wordFuzzyMatches(word, brandNorm)
}

function spokenWordMatchesModelToken(word: string, modelTokenNorm: string): boolean {
  // Tokens cortos ("fin", "h", "ac") no deben fuzzy-matchear palabras largas
  // ("financiamiento" → "fin" del modelo "2008 fin h...").
  if (modelTokenNorm.length < 2) return false
  if (modelTokenNorm.length < 4) {
    return normalizeForMatch(word) === modelTokenNorm
  }
  return wordFuzzyMatches(word, modelTokenNorm)
}

function resolveTopicOverlayFromSpeech(wordsAfter: string[]): string | null {
  for (const word of wordsAfter) {
    const n = normalizeForMatch(word)
    const canonical = COMENTA_TOPIC_CANONICAL[n]
    if (canonical) return `COMENTA ${canonical}`
    // Prefijo: "financia...", "financiamo..." (ASR truncado)
    if (n.startsWith('financi')) return 'COMENTA FINANCIAMIENTO'
  }
  return null
}

/** Etiqueta en pantalla (inventario) para una palabra dicha tras el CTA; null si no matchea. */
function inventoryLabelForSpokenWord(
  word: string,
  brandLine: string | null | undefined,
  modelLine: string | null | undefined
): string | null {
  // Temas (financiamiento, crédito…) nunca se tratan como marca/modelo.
  const n = normalizeForMatch(word)
  if (COMENTA_TOPIC_CANONICAL[n] || n.startsWith('financi')) return null

  const brand = brandLine?.trim() ?? ''
  if (brand && spokenWordMatchesBrand(word, brand)) {
    return brand.toUpperCase()
  }

  const model = modelLine?.trim() ?? ''
  if (!model) return null

  for (const raw of model.split(/\s+/).filter(Boolean)) {
    if (/^\d{3,4}$/.test(raw)) continue
    const norm = normalizeForMatch(raw)
    if (norm.length >= 2 && spokenWordMatchesModelToken(word, norm)) {
      return raw.toUpperCase()
    }
  }

  const firstRaw = model.split(/\s+/)[0]?.trim() ?? ''
  if (firstRaw) {
    const mergedNorm = normalizeForMatch(firstRaw).replace(/\s+/g, '')
    if (mergedNorm.length >= 2 && spokenWordMatchesModelToken(word, mergedNorm)) {
      return firstRaw.toUpperCase()
    }
  }

  return null
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

/**
 * Prioridad: tema (financiamiento…) → marca/modelo dicho → null.
 * Null no debe caer en vehículo inventado si la voz dijo otra cosa.
 */
function resolveComentaOverlayFromSpeech(
  wordsAfter: string[],
  brandLine: string | null | undefined,
  modelLine: string | null | undefined,
  yearLine: string | null | undefined
): string | null {
  if (wordsAfter.length === 0) return null

  const topic = resolveTopicOverlayFromSpeech(wordsAfter)
  if (topic) return topic

  for (const word of wordsAfter) {
    const label = inventoryLabelForSpokenWord(word, brandLine, modelLine)
    if (label) {
      return buildComentaOverlayFromMiddle([label], yearLine)
    }
  }

  // Dijo algo tras el CTA pero no es marca/modelo: mostrar esa palabra, no el vehículo.
  const first = wordsAfter[0]
  if (first) return `COMENTA ${first.toUpperCase()}`

  return null
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
 * Detecta comenta / menciona / escribe en Assembly.
 * Overlay: COMENTA + tema (financiamiento…) o marca/modelo dicho; sin inventar vehículo.
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
  // Fallback inventario solo si el CTA no trae palabra después (ej. solo "comenta").
  // Si dijo "financiamiento" u otra cosa, nunca inventar el vehículo.
  const spokenOverlay = resolveComentaOverlayFromSpeech(
    wordsAfter,
    opts?.brandLine,
    opts?.modelLine,
    opts?.yearLine
  )
  const comentaOverlayText =
    spokenOverlay ??
    (wordsAfter.length === 0
      ? buildComentaOverlayText(opts?.modelLine, opts?.yearLine)
      : 'COMENTA')
  const subtitleBlocks = cutSubtitleBlocksAtComenta(blocks, comentaTimeSec)

  if (opts?.jobId) {
    const source =
      spokenOverlay != null
        ? spokenOverlay.includes('FINANCIAMIENTO') ||
          spokenOverlay.includes('CREDITO') ||
          spokenOverlay.includes('ENGANCHE') ||
          spokenOverlay.includes('CUOTA')
          ? `voz [${wordsAfter.join(', ')}] → tema (sin vehículo)`
          : `voz [${wordsAfter.join(', ')}] → 1 palabra inventario`
        : wordsAfter.length > 0
          ? `voz [${wordsAfter.join(', ')}] sin match → COMENTA solo`
          : 'fallback inventario (solo CTA)'
    console.log(
      `[ComentaAssembly][${opts.jobId}] COMENTA detectado t=${comentaTimeSec.toFixed(2)}s ` +
        `overlay="${comentaOverlayText}" (${source}) ` +
        `(${blocks.length} → ${subtitleBlocks.length} subtítulos)`
    )
  }

  return { subtitleBlocks, comentaTimeSec, comentaOverlayText }
}
