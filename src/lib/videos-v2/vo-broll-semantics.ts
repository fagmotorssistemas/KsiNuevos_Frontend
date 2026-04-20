/**
 * Planifica qué clip B-roll (solo visual) se muestra en cada tramo del bloque de voz en off,
 * usando (1) coocurrencias tema↔plano de los visual_overlay que ya eligió Gemini en el resto del Reel,
 * (2) palabras de la VO en ventanas de tiempo, (3) pistas del nombre de archivo subido.
 */

import type { RawWord } from './assemblyai'
import type { Segment, SequenceItem } from './segmenter'
import { collectSpokenWordsForClipUntil } from './segmenter'

export interface VoBrollTile {
  clipIndex: number
  timeStart: number
  duration: number
  trimStart: number
}

const STOP = new Set([
  'con', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'por', 'para',
  'que', 'y', 'o', 'se', 'su', 'sus', 'le', 'les', 'lo', 'es', 'son', 'hay', 'muy', 'mas', 'más', 'no', 'si',
  'sí', 'ya', 'me', 'te', 'tu', 'tus', 'mi', 'mis', 'solo', 'también', 'esta', 'este', 'esto', 'como', 'cuenta',
  'tiene', 'tienen', 'ser', 'era', 'fue', 'han', 'puede',
])

function normToken(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function tokenizeMeaningful(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => normToken(w))
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function buildCooccurrenceFromSequence(
  narrativeSequence: SequenceItem[],
  allSegments: Segment[],
  brollIndices: Set<number>
): Map<number, Map<string, number>> {
  const lookup = new Map(allSegments.map((s) => [s.segment_id, s] as const))
  const cooc = new Map<number, Map<string, number>>()

  for (const item of narrativeSequence) {
    if (!item.visual_overlay) continue
    const bi = item.visual_overlay.clip_index
    if (!brollIndices.has(bi)) continue
    const seg = lookup.get(item.segment_id)
    if (!seg) continue

    let bag = cooc.get(bi)
    if (!bag) {
      bag = new Map()
      cooc.set(bi, bag)
    }
    const bump = (tok: string) => {
      if (tok.length < 3 || STOP.has(tok)) return
      bag!.set(tok, (bag!.get(tok) || 0) + 2)
    }
    for (const t of tokenizeMeaningful(`${seg.text} ${item.reason || ''}`)) bump(t)
    for (const w of seg.words) {
      const t = normToken(w.text)
      bump(t)
    }
  }
  return cooc
}

function partitionVoWindows(words: RawWord[], maxEndMs: number): { t0s: number; t1s: number; text: string }[] {
  if (words.length === 0) return []
  const GAP_MS = 520
  const TARGET_SPAN_MS = 2700
  const out: { t0s: number; t1s: number; text: string }[] = []
  let chunk: RawWord[] = []

  const flush = () => {
    if (chunk.length === 0) return
    const t0s = Math.max(0, chunk[0].start / 1000)
    const t1s = Math.min(maxEndMs / 1000, chunk[chunk.length - 1].end / 1000)
    const text = chunk.map((w) => w.text).join(' ')
    out.push({ t0s, t1s, text })
    chunk = []
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (chunk.length === 0) {
      chunk.push(w)
      continue
    }
    const prev = chunk[chunk.length - 1]
    const gap = w.start - prev.end
    const span = w.end - chunk[0].start
    if (gap > GAP_MS || span >= TARGET_SPAN_MS) {
      flush()
      chunk.push(w)
    } else {
      chunk.push(w)
    }
  }
  flush()
  return out
}

function scoreClipForWindow(
  clipIndex: number,
  windowTokens: string[],
  cooc: Map<number, Map<string, number>>,
  filenameLower: string
): number {
  const bag = cooc.get(clipIndex)
  let s = 0
  if (bag && windowTokens.length > 0) {
    for (const t of windowTokens) {
      s += bag.get(t) || 0
    }
  }
  if (filenameLower && windowTokens.length > 0) {
    for (const t of windowTokens) {
      if (t.length >= 4 && filenameLower.includes(t)) s += 6
    }
  }
  return s
}

/** Igual que el antiguo plan lineal por orden de archivo (fallback). */
export function planLinearBrollTiling(
  voDurationSec: number,
  brollIndices: number[],
  clipFileDurationsSec: (number | null)[]
): VoBrollTile[] {
  const tiles: VoBrollTile[] = []
  let t = 0
  for (const idx of brollIndices) {
    if (t >= voDurationSec - 0.04) break
    const fileDur = clipFileDurationsSec[idx]
    const dur =
      typeof fileDur === 'number' && Number.isFinite(fileDur) && fileDur > 0.05
        ? fileDur
        : Math.max(0.1, voDurationSec - t)
    const remaining = Math.max(0, voDurationSec - t)
    const useDur = Number(Math.min(dur, remaining).toFixed(3))
    if (useDur < 0.08) continue
    tiles.push({ clipIndex: idx, timeStart: t, duration: useDur, trimStart: 0 })
    t += useDur
  }
  return tiles
}

/**
 * Ventanas temporales según la VO + pistas de Gemini (`visual_overlay`) + nombre de archivo.
 */
export function buildSemanticVoiceOverBrollTiles(
  voDurationSec: number,
  brollClipIndices: number[],
  clipFileDurationsSec: (number | null)[],
  narrativeSequence: SequenceItem[],
  allSegments: Segment[],
  voClipIndex: number,
  filenamesByClipIndex: string[]
): VoBrollTile[] {
  if (brollClipIndices.length === 0) return []

  const maxMs = voDurationSec * 1000
  const words = collectSpokenWordsForClipUntil(allSegments, voClipIndex, maxMs)
  if (words.length === 0) {
    return planLinearBrollTiling(voDurationSec, brollClipIndices, clipFileDurationsSec)
  }

  const brollSet = new Set(brollClipIndices)
  const cooc = buildCooccurrenceFromSequence(narrativeSequence, allSegments, brollSet)
  const windows = partitionVoWindows(words, maxMs)
  const usage = new Map<number, number>()
  let rr = 0
  const tiles: VoBrollTile[] = []

  for (const win of windows) {
    const t0 = win.t0s
    const t1 = Math.min(voDurationSec, win.t1s)
    if (t1 <= t0 + 0.06) continue

    const windowToks = tokenizeMeaningful(win.text)
    let best = brollClipIndices[0]!
    let bestAdj = Number.NEGATIVE_INFINITY

    for (const bi of brollClipIndices) {
      const fn = (filenamesByClipIndex[bi] || '').toLowerCase()
      const raw = scoreClipForWindow(bi, windowToks, cooc, fn)
      const used = usage.get(bi) || 0
      const adj = raw - used * 0.35
      if (adj > bestAdj) {
        bestAdj = adj
        best = bi
      }
    }

    if (bestAdj <= 0 && brollClipIndices.length > 1) {
      best = brollClipIndices[rr % brollClipIndices.length]!
      rr++
    }

    usage.set(best, (usage.get(best) || 0) + 1)

    const wantDur = t1 - t0
    const fileDur = clipFileDurationsSec[best]
    const maxFromFile =
      typeof fileDur === 'number' && Number.isFinite(fileDur) && fileDur > 0.08 ? fileDur : wantDur
    const useDur = Number(Math.min(wantDur, maxFromFile, voDurationSec - t0).toFixed(3))
    if (useDur < 0.1) continue

    tiles.push({
      clipIndex: best,
      timeStart: Number(t0.toFixed(3)),
      duration: useDur,
      trimStart: 0,
    })
  }

  if (tiles.length === 0) {
    return planLinearBrollTiling(voDurationSec, brollClipIndices, clipFileDurationsSec)
  }

  const lastEnd = tiles.reduce((m, x) => Math.max(m, x.timeStart + x.duration), 0)
  if (lastEnd < voDurationSec - 0.25) {
    const tail = planLinearBrollTiling(voDurationSec - lastEnd, brollClipIndices, clipFileDurationsSec).map(
      (x) => ({
        ...x,
        timeStart: Number((lastEnd + x.timeStart).toFixed(3)),
      })
    )
    tiles.push(...tail)
  }

  return tiles
}
