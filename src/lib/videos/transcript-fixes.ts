/**
 * Correcciones de la transcripción automática que devuelve Claude junto con el montaje
 * (ej. "cuadragésimo" → "XL", "2010" → "2.0"). Se aplican a las palabras de los segmentos antes de
 * armar subtítulos, "comenta" y frases destacadas. La transcripción guardada (segment_map) no se toca:
 * las correcciones viven en gemini_analysis y el re-render y el editor las vuelven a aplicar.
 */

import type { RawWord } from './assemblyai'
import type { Segment } from './segmenter'

export interface TranscriptFix {
  segment_id: string
  /** Palabras consecutivas tal como están en la transcripción. */
  wrong: string
  /** Cómo se dijeron (o cómo se escriben en pantalla). */
  right: string
}

/** Son correcciones de palabras mal oídas, no reescrituras: pocas y cortas. */
const MAX_FIXES = 12
const MAX_WORDS_PER_SIDE = 4
const MAX_CHARS_PER_SIDE = 40

const TRAILING_PUNCT_RE = /[.,;:!?…]+$/
const LEADING_PUNCT_RE = /^[¿¡]+/

function normToken(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/** Índice de la primera palabra de `wrong` (palabras consecutivas) dentro del segmento, o -1. */
function findRun(words: RawWord[], wrongTokens: string[]): number {
  if (wrongTokens.length === 0) return -1
  const norm = words.map((w) => normToken(w.text))
  for (let i = 0; i + wrongTokens.length <= norm.length; i++) {
    if (wrongTokens.every((t, k) => norm[i + k] === t)) return i
  }
  return -1
}

/**
 * Deja solo correcciones usables: campos de texto, cortas, que cambien algo y, si vienen `segments`,
 * cuyo `wrong` exista tal cual en las palabras de ese segmento.
 */
export function normalizeTranscriptFixes(raw: unknown, segments?: Segment[]): TranscriptFix[] {
  if (!Array.isArray(raw)) return []
  const bySegment = segments ? new Map(segments.map((s) => [s.segment_id, s] as const)) : null
  const seen = new Set<string>()
  const out: TranscriptFix[] = []
  for (const item of raw) {
    if (out.length >= MAX_FIXES) break
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const segment_id = typeof o.segment_id === 'string' ? o.segment_id.trim() : ''
    const wrong = typeof o.wrong === 'string' ? o.wrong.trim() : ''
    const right = typeof o.right === 'string' ? o.right.trim() : ''
    if (!segment_id || !wrong || !right) continue
    if (wrong.length > MAX_CHARS_PER_SIDE || right.length > MAX_CHARS_PER_SIDE) continue
    const wrongTokens = splitWords(wrong).map(normToken).filter(Boolean)
    const rightWords = splitWords(right)
    if (wrongTokens.length === 0 || wrongTokens.length > MAX_WORDS_PER_SIDE) continue
    if (rightWords.length > MAX_WORDS_PER_SIDE) continue
    if (wrongTokens.join(' ') === rightWords.map(normToken).join(' ') && wrong === right) continue
    if (bySegment) {
      const seg = bySegment.get(segment_id)
      if (!seg || findRun(seg.words ?? [], wrongTokens) < 0) continue
    }
    const key = `${segment_id}|${wrongTokens.join(' ')}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ segment_id, wrong, right })
  }
  return out
}

/**
 * Reemplaza las palabras de `fix.wrong` por las de `fix.right` dentro del mismo tramo de tiempo
 * (repartido en partes iguales) y conserva la puntuación de los extremos (ej. "2010," → "2.0,").
 */
function replaceRun(words: RawWord[], fix: TranscriptFix): RawWord[] {
  const wrongTokens = splitWords(fix.wrong).map(normToken).filter(Boolean)
  const at = findRun(words, wrongTokens)
  if (at < 0) return words
  const run = words.slice(at, at + wrongTokens.length)
  const first = run[0]!
  const last = run[run.length - 1]!
  const leading = first.text.match(LEADING_PUNCT_RE)?.[0] ?? ''
  const trailing = last.text.match(TRAILING_PUNCT_RE)?.[0] ?? ''
  const rightWords = splitWords(fix.right)
  const step = (last.end - first.start) / rightWords.length

  const replaced = rightWords.map((text, k): RawWord => {
    const isFirst = k === 0
    const isLast = k === rightWords.length - 1
    const withPunct =
      (isFirst && !LEADING_PUNCT_RE.test(text) ? leading : '') +
      text +
      (isLast && !TRAILING_PUNCT_RE.test(text) ? trailing : '')
    return {
      ...run[Math.min(k, run.length - 1)]!,
      text: withPunct,
      start: Math.round(first.start + k * step),
      end: isLast ? last.end : Math.round(first.start + (k + 1) * step),
    }
  })
  return [...words.slice(0, at), ...replaced, ...words.slice(at + run.length)]
}

/** Segmentos con las correcciones aplicadas; los que no cambian se devuelven tal cual. */
export function applyTranscriptFixes(segments: Segment[], fixes: TranscriptFix[] | undefined): Segment[] {
  if (!fixes || fixes.length === 0) return segments
  const bySegment = new Map<string, TranscriptFix[]>()
  for (const fix of fixes) bySegment.set(fix.segment_id, [...(bySegment.get(fix.segment_id) ?? []), fix])

  return segments.map((seg) => {
    const segFixes = bySegment.get(seg.segment_id)
    if (!segFixes || !seg.words?.length) return seg
    const words = segFixes.reduce(replaceRun, seg.words)
    if (words === seg.words) return seg
    return { ...seg, words, text: words.map((w) => w.text).join(' '), word_count: words.length }
  })
}
