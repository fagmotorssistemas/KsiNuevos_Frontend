/**
 * Utilidades de los compositores Motion 3D (camioneta, familiar, premium): tiempos de los gráficos
 * según la palabra dicha, subtítulos, aleatorio con semilla y el reparto del espacio en pantalla
 * que deja libre la cara de la persona.
 */

import type { Segment, SubtitleBlock } from '@/lib/videos/segmenter'
import type { CutTiming, ReelTimeline } from './composer'

export const W = 1080
export const H = 1920

export const r3 = (n: number) => Number(n.toFixed(3))

export function prng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const normWord = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '')

/** Momento del Reel en que se dice `cue` dentro del corte (o null si no está). */
export function cueTime(cut: CutTiming, segment: Segment | undefined, cue: string | null): number | null {
  if (!cue || !segment) return null
  const target = normWord(cue.split(/\s+/)[0] ?? '')
  if (!target) return null
  const from = cut.sourceStart * 1000 - 60
  const to = (cut.sourceStart + (cut.end - cut.start)) * 1000
  const word = segment.words.find((w) => w.start >= from && w.start <= to && normWord(w.text).startsWith(target))
  if (!word) return null
  return cut.start + word.start / 1000 - cut.sourceStart - 0.08
}

export type Timed = { start: number; end: number }

/** Lo que ya lleva este tiempo en pantalla puede salir antes para dejar entrar lo nuevo. */
export const MIN_ON_SCREEN = 0.7

export type CaptionGroup = { start: number; end: number; words: { text: string; start: number; end: number; key: boolean }[] }

export function buildCaptionGroups(blocks: SubtitleBlock[], highlightPhrases: string[], until: number): CaptionGroup[] {
  const keyWords = new Set(
    highlightPhrases.flatMap((p) => p.split(/\s+/).map(normWord)).filter((w) => w.length >= 4)
  )
  const isKey = (text: string) => {
    const n = normWord(text)
    return /\d/.test(n) || keyWords.has(n)
  }
  const groups = blocks
    .filter((b) => b.text?.trim() && b.duration > 0.05 && b.time < until)
    .sort((a, b) => a.time - b.time)
    .map((b) => {
      const start = r3(b.time)
      const end = r3(Math.min(until, b.time + b.duration))
      const words =
        b.words && b.words.length > 0
          ? b.words.map((w) => ({ text: w.text, start: r3(w.start), end: r3(w.end), key: isKey(w.text) }))
          : [{ text: b.text, start, end, key: false }]
      return { start, end, words }
    })
  // En los cortes con solape dos frases pueden coincidir: la anterior se corta cuando entra la siguiente.
  return groups.filter((g, i) => {
    const next = groups[i + 1]
    if (next && next.start < g.end) {
      g.end = next.start
      g.words = g.words.filter((w) => w.start < g.end - 0.05)
      for (const w of g.words) w.end = Math.min(w.end, g.end)
    }
    return g.words.length > 0 && g.end - g.start >= 0.12
  })
}

type BeatTiming = { kind: string; segment_id: string; cue_word: string | null; offset: number; duration: number }

/**
 * Ubica cada beat en el tiempo del Reel: entra con su palabra (o a `offset` del inicio del corte) y puede
 * seguir hasta 1 s después del corte (lo nuevo lo saca antes). Las transiciones van al inicio del corte.
 */
export function placeBeats<B extends BeatTiming>(
  beats: B[],
  timeline: ReelTimeline,
  segments: Segment[],
  until: number
): { b: B; cut: CutTiming; start: number; end: number }[] {
  const segById = new Map(segments.map((s) => [s.segment_id, s]))
  const cutBySegment = new Map(timeline.cuts.map((c) => [c.item.segment_id, c]))
  return beats
    .map((b) => {
      const cut = cutBySegment.get(b.segment_id)
      if (!cut) return null
      const cutLen = cut.visibleEnd - cut.start
      let start =
        b.kind === 'transicion'
          ? cut.start
          : (cueTime(cut, segById.get(b.segment_id), b.cue_word) ?? cut.start + Math.min(b.offset, Math.max(0, cutLen - 0.6)))
      start = Math.max(cut.start, Math.min(start, cut.visibleEnd - 0.2))
      const end = Math.min(until, start + b.duration, cut.visibleEnd + 1)
      if (b.kind !== 'transicion' && end - start < 0.5) return null
      return { b, cut, start: r3(start), end: r3(end) }
    })
    .filter((x): x is { b: B; cut: CutTiming; start: number; end: number } => x != null)
    .sort((a, b) => a.start - b.start)
}

// ─── Cara de la persona ──────────────────────────────────────────────────────

export type Band = { top: number; bottom: number }

/** Margen alrededor de la cabeza que informa Claude (se mueve un poco durante el corte). */
const FACE_MARGIN = 60

/** Banda vertical (px) de la cabeza a partir de face_top/face_bottom en %; null si no hay persona. */
export function faceBandPx(top: number | null, bottom: number | null): Band | null {
  if (top == null || bottom == null || bottom <= top) return null
  return { top: Math.round((top / 100) * H) - FACE_MARGIN, bottom: Math.round((bottom / 100) * H) + FACE_MARGIN }
}

export const overlaps = (a: Band, b: Band) => a.top < b.bottom && b.top < a.bottom

// ─── Reparto del espacio ─────────────────────────────────────────────────────

export type SlotName = 'arriba' | 'centro' | 'abajo'

/** Lo más chico que puede quedar una pieza para entrar en el espacio libre junto a la cara. */
const MIN_SCALE = 0.72

/**
 * Reparto vertical de la pantalla para los formatos familiar y premium. Cada pieza ocupa una banda
 * [top, top + alto]; nunca pisa la cara del corte ni otra pieza que aún no se ha visto lo suficiente
 * (si la otra ya se vio, sale cuando entra la nueva). Si no cabe entera, se achica hasta MIN_SCALE.
 * Lo que quedó de un corte anterior sale cuando entra la primera pieza del corte nuevo.
 */
export class Layout {
  private used: (Band & Timed & { cut: number; pieces: Timed[] })[] = []
  constructor(private area: Band) {}

  private commit(box: Band, start: number, end: number, cut: number): Timed[] {
    for (const u of this.used) {
      const clash = overlaps(u, box) || u.cut < cut
      if (clash && u.start < end && start < u.end && start - u.start >= MIN_ON_SCREEN) {
        u.end = start
        for (const p of u.pieces) p.end = Math.min(p.end, start)
      }
    }
    const entry = { ...box, start, end, cut, pieces: [] as Timed[] }
    this.used.push(entry)
    return entry.pieces
  }

  /** Bandas libres del área sin la cara, de la más cercana a la zona preferida a la más lejana. */
  private freeBands(face: Band | null, prefer: SlotName): Band[] {
    const { top, bottom } = this.area
    const bands =
      face && overlaps(face, this.area)
        ? [
            { top, bottom: Math.min(bottom, face.top) },
            { top: Math.max(top, face.bottom), bottom },
          ].filter((b) => b.bottom - b.top > 60)
        : [{ top, bottom }]
    const anchor = prefer === 'arriba' ? top : prefer === 'abajo' ? bottom : (top + bottom) / 2
    const dist = (b: Band) => (anchor >= b.top && anchor <= b.bottom ? 0 : Math.min(Math.abs(anchor - b.top), Math.abs(anchor - b.bottom)))
    return bands.sort((a, b) => dist(a) - dist(b))
  }

  place(
    height: number,
    start: number,
    end: number,
    opts: { prefer: SlotName; face: Band | null; cut: number }
  ): { top: number; scale: number; hold: Timed[] } | null {
    for (const band of this.freeBands(opts.face, opts.prefer)) {
      const room = band.bottom - band.top
      const scale = Math.min(1, room / height)
      if (scale < MIN_SCALE) continue
      const h = Math.round(height * scale)
      const aligned =
        opts.prefer === 'arriba' ? band.top : opts.prefer === 'abajo' ? band.bottom - h : Math.round((band.top + band.bottom - h) / 2)
      const clamp = (t: number) => Math.max(band.top, Math.min(band.bottom - h, t))
      const tops = [...new Set([aligned, band.top, band.bottom - h, Math.round((band.top + band.bottom - h) / 2)].map(clamp))]
      for (const top of tops) {
        const box = { top, bottom: top + h }
        const clashes = this.used.filter((u) => overlaps(u, box) && u.start < end && start < u.end)
        if (!clashes.every((u) => start - u.start >= MIN_ON_SCREEN)) continue
        return { top, scale: r3(scale), hold: this.commit(box, start, end, opts.cut) }
      }
    }
    return null
  }

  /** Ocupa una banda fija (piezas que van sobre un punto de la toma, como las señales). */
  reserve(band: Band, start: number, end: number, cut: number): Timed[] | null {
    const clashes = this.used.filter((u) => overlaps(u, band) && u.start < end && start < u.end)
    if (!clashes.every((u) => start - u.start >= MIN_ON_SCREEN)) return null
    return this.commit(band, start, end, cut)
  }
}

// ─── Movimiento del video (formatos familiar y premium) ──────────────────────

export type CutTransition<K extends string> = { i: number; at: number; kind: K }

/**
 * Una transición en cada cambio de toma: la que pidió Claude para ese corte o, si no pidió, la siguiente
 * de `rotation` (sin repetir la anterior). `forVisual` = la que va al entrar una toma sin habla.
 */
export function cutTransitions<K extends string>(
  timeline: ReelTimeline,
  opts: { chosen: Map<number, K>; rotation: K[]; forVisual?: K; visualSegments: Set<string>; rnd: () => number }
): CutTransition<K>[] {
  const until = timeline.contentSec
  const out: CutTransition<K>[] = []
  let k = Math.floor(opts.rnd() * opts.rotation.length)
  for (const c of timeline.cuts.slice(1)) {
    const at = r3(c.start)
    if (at < 0.4 || at > until - 0.4) continue
    let kind = opts.chosen.get(c.index)
    if (!kind && opts.forVisual && opts.visualSegments.has(c.item.segment_id)) kind = opts.forVisual
    if (!kind) {
      kind = opts.rotation[k % opts.rotation.length]!
      if (out.length && out[out.length - 1]!.kind === kind) kind = opts.rotation[++k % opts.rotation.length]!
      k++
    }
    out.push({ i: c.index, at, kind })
  }
  return out
}

/**
 * Zoom de golpe cuando se dice una palabra clave (cifras y frases destacadas): como mucho uno cada
 * 1,6 s y nunca pegado a un cambio de toma, para que no maree.
 */
export function keywordPunches(groups: CaptionGroup[], cutStarts: number[], until: number): number[] {
  const out: number[] = []
  for (const g of groups) {
    for (const w of g.words) {
      if (!w.key) continue
      const t = r3(w.start)
      if (t < 0.6 || t > until - 0.5) continue
      if (out.length && t - out[out.length - 1]! < 1.6) continue
      if (cutStarts.some((c) => t >= c - 0.15 && t < c + 0.45)) continue
      out.push(t)
    }
  }
  return out
}

/** Golpes de la música dentro de las tomas sin habla y del cierre (ahí la imagen late con el ritmo). */
export function beatPulses(beats: number[], timeline: ReelTimeline, visualSegments: Set<string>): number[] {
  const windows: [number, number][] = timeline.cuts
    .filter((c) => visualSegments.has(c.item.segment_id))
    .map((c) => [c.start + 0.35, c.visibleEnd - 0.15])
  windows.push([timeline.contentSec + 0.6, timeline.totalSec - 0.3])
  // Con tempos rápidos, un pulso cada dos golpes.
  const gap = beats.length > 1 ? (beats[beats.length - 1]! - beats[0]!) / (beats.length - 1) : 1
  const step = gap < 0.45 ? 2 : 1
  return beats.filter((b, i) => i % step === 0 && windows.some(([a, z]) => b >= a && b <= z)).map(r3)
}

export function visualSegmentIds(segments: Segment[]): Set<string> {
  return new Set(segments.filter((s) => s.source_kind === 'visual_only').map((s) => s.segment_id))
}
