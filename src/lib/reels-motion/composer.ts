/**
 * Compositor Motion 3D: convierte el montaje (cortes), los subtítulos y el plan de movimiento de Claude
 * en una composición HyperFrames (index.html). Aquí se resuelven todos los tiempos absolutos y las
 * posiciones; el runtime del navegador (reels-motion/runtime/reel.js) solo dibuja lo que recibe.
 *
 * Los cortes se ubican igual que en Shotstack (computeReelClipStartSec), así los subtítulos ya
 * calculados por el pipeline quedan sincronizados sin tocarlos.
 */

import type { Segment, SequenceItem, SubtitleBlock } from '@/lib/videos/segmenter'
import { computeReelClipStartSec } from '@/lib/videos/reel-timeline'
import {
  ACCENT_COLORS,
  type Entrance,
  type MotionBeat,
  type MotionPlan,
  type Slot,
} from './motion-plan'

const W = 1080
const H = 1920

/** Cierre K-SI NUEVOS que se agrega después del último corte. */
export const CLOSING_SEC = 2.4
const CAPTION_Y = 1430
/** Tamaño de subtítulo por tipografía (Montserrat y Russo son más anchas que Anton). */
const CAPTION_SIZE: Record<string, number> = { anton: 92, russo: 72, montserrat: 64 }

const SLOT_Y: Record<Slot, number> = { arriba: 330, centro: 800, abajo: 1180 }
const SLOT_ORDER: Slot[] = ['arriba', 'centro', 'abajo']
const TITLE_SIZE = { gigante: 290, grande: 190, mediano: 130 } as const

// ─── Tiempos de los cortes ────────────────────────────────────────────────────

export interface CutTiming {
  index: number
  item: SequenceItem
  /** Inicio y fin visibles en el Reel (segundos). */
  start: number
  end: number
  /** Cuando entra el corte siguiente (en los cortes con solape, antes de `end`). */
  visibleEnd: number
  /** Segundo del clip original donde empieza este corte. */
  sourceStart: number
}

export interface ReelTimeline {
  cuts: CutTiming[]
  /** Fin del último corte (sin el cierre). */
  contentSec: number
  totalSec: number
}

export function computeReelTimeline(sequence: SequenceItem[]): ReelTimeline {
  const contentSec = Number(sequence.reduce((acc, it) => acc + it.trim_duration, 0).toFixed(3))
  const cuts = sequence.map((item, index) => {
    const start = computeReelClipStartSec(sequence, index)
    // El último corte se estira hasta el final (igual que en Shotstack, que absorbe los solapes).
    const end = index === sequence.length - 1 ? contentSec : Number((start + item.trim_duration).toFixed(3))
    return { index, item, start, end, visibleEnd: end, sourceStart: item.trim_start }
  })
  for (let i = 0; i + 1 < cuts.length; i++) cuts[i]!.visibleEnd = Math.min(cuts[i]!.end, cuts[i + 1]!.start)
  return { cuts, contentSec, totalSec: Number((contentSec + CLOSING_SEC).toFixed(3)) }
}

/** Tramos de cada clip original que usa el Reel: [inicio, fin] en segundos del clip. */
export function neededClipRanges(
  timeline: ReelTimeline,
  clipDurationsSec: Map<number, number>
): Map<number, [number, number]> {
  const ranges = new Map<number, [number, number]>()
  const add = (clip: number, a: number, b: number) => {
    const cur = ranges.get(clip)
    ranges.set(clip, cur ? [Math.min(cur[0], a), Math.max(cur[1], b)] : [a, b])
  }
  for (const c of timeline.cuts) {
    add(c.item.clip_index, c.sourceStart, c.sourceStart + (c.end - c.start))
    const ov = c.item.visual_overlay
    if (ov) add(ov.clip_index, ov.trim_start, ov.trim_start + c.item.trim_duration)
  }
  const tail = tailSource(timeline, clipDurationsSec)
  if (tail) add(tail.clip, tail.start, tail.start + CLOSING_SEC)
  for (const [clip, [a, b]] of ranges) {
    const dur = clipDurationsSec.get(clip)
    ranges.set(clip, [Math.max(0, a - 0.2), dur ? Math.min(dur, b + 0.3) : b + 0.3])
  }
  return ranges
}

/** Fondo del cierre: el último clip sigue corriendo (o lo más cerca posible de su final). */
function tailSource(timeline: ReelTimeline, clipDurationsSec: Map<number, number>) {
  const last = timeline.cuts[timeline.cuts.length - 1]
  if (!last) return null
  const clip = last.item.clip_index
  const want = last.sourceStart + (last.end - last.start)
  const dur = clipDurationsSec.get(clip)
  const start = dur ? Math.max(0, Math.min(want, dur - CLOSING_SEC - 0.1)) : want
  return { clip, start }
}

// ─── Datos para el runtime (reel.js) ─────────────────────────────────────────

export interface ReelData {
  duration: number
  accent: string
  material: string
  titleFont: string
  captionFont: string
  cutMotion: { id: string; start: number; end: number; motion: 'golpe' | 'empuje' }[]
  titles: { text: string; x: number; y: number; size: number; start: number; end: number; entrance: Entrance; seed: number }[]
  kickers: { text: string; x: number; y: number; start: number; end: number }[]
  plates: { text: string; x: number; y: number; start: number; end: number; rotate: number; from: string; size: number }[]
  scans: { index: number; label: string; point: [number, number] | null; frame: [number, number, number, number] | null; start: number; end: number }[]
  occupants: { count: number; x: number; y: number; start: number; end: number }[]
  comments: { text: string; y: number; start: number; end: number }[]
  mudSplats: { start: number; end: number; seed: number }[]
  debris: { origin: [number, number]; start: number; seed: number; count: number; spread: number }[]
  mudWipes: { at: number; seed: number }[]
  flashes: { at: number }[]
  shakes: { at: number }[]
  captions: { y: number; size: number; groups: { start: number; end: number; words: { text: string; start: number; end: number; key: boolean }[] }[] }
  closing: { start: number; end: number; brand: string; place: string; cta: string }
}

export type SfxKind = 'whoosh' | 'pop' | 'impacto'

export interface ComposeInput {
  sequence: SequenceItem[]
  segments: Segment[]
  subtitleBlocks: SubtitleBlock[]
  plan: MotionPlan
  /** Frases a destacar (caption_highlights de Claude). */
  highlightPhrases: string[]
  /** Clip original → archivo recortado de la composición (ruta relativa) y su inicio en el original. */
  clipFiles: Map<number, { file: string; rangeStartSec: number; hasAudio: boolean }>
  clipDurationsSec: Map<number, number>
  music: { file: string; trimStartSec: number; volume: number } | null
  dialogueVolume: number
  /** Efectos disponibles (ruta relativa); los que falten simplemente no suenan. */
  sfxFiles: Partial<Record<SfxKind, string>>
  seed: number
}

function prng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function seedFromId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

const r3 = (n: number) => Number(n.toFixed(3))

const normWord = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '')

/** Momento del Reel en que se dice `cue` dentro del corte (o null si no está). */
function cueTime(cut: CutTiming, segment: Segment | undefined, cue: string | null): number | null {
  if (!cue || !segment) return null
  const target = normWord(cue.split(/\s+/)[0] ?? '')
  if (!target) return null
  const from = cut.sourceStart * 1000 - 60
  const to = (cut.sourceStart + (cut.end - cut.start)) * 1000
  const word = segment.words.find((w) => w.start >= from && w.start <= to && normWord(w.text).startsWith(target))
  if (!word) return null
  return cut.start + word.start / 1000 - cut.sourceStart - 0.08
}

type Timed = { start: number; end: number }

/** Lo que ya lleva este tiempo en pantalla puede salir antes para dejar entrar lo nuevo. */
const MIN_ON_SCREEN = 0.7

/**
 * Reparto de las tres franjas (arriba, centro, abajo) para que dos gráficos no se encimen.
 * Lo nuevo manda: si la franja la ocupa algo que ya se vio lo suficiente, eso sale cuando entra lo nuevo.
 */
class SlotBook {
  private used: { slot: Slot; start: number; end: number; pieces: Timed[] }[] = []
  take(preferred: Slot, start: number, end: number): { slot: Slot; hold: Timed[] } | null {
    for (const slot of [preferred, ...SLOT_ORDER.filter((x) => x !== preferred)]) {
      const clashes = this.used.filter((u) => u.slot === slot && u.start < end && start < u.end)
      if (!clashes.every((u) => start - u.start >= MIN_ON_SCREEN)) continue
      for (const u of clashes) {
        u.end = start
        for (const p of u.pieces) p.end = Math.min(p.end, start)
      }
      const entry = { slot, start, end, pieces: [] as Timed[] }
      this.used.push(entry)
      return { slot, hold: entry.pieces }
    }
    return null
  }
}

function slotNear(y: number): Slot {
  return SLOT_ORDER.reduce((best, s) => (Math.abs(SLOT_Y[s] - y) < Math.abs(SLOT_Y[best] - y) ? s : best), 'centro')
}

function buildCaptionGroups(blocks: SubtitleBlock[], highlightPhrases: string[], until: number) {
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

export function buildReelData(
  input: ComposeInput,
  timeline: ReelTimeline
): { data: ReelData; sfx: { kind: SfxKind; at: number }[] } {
  const { plan } = input
  const rnd = prng(input.seed)
  const accent = ACCENT_COLORS[plan.style.accent]
  const segById = new Map(input.segments.map((s) => [s.segment_id, s]))
  const cutBySegment = new Map(timeline.cuts.map((c) => [c.item.segment_id, c]))
  const slots = new SlotBook()
  const until = timeline.contentSec

  const data: ReelData = {
    duration: timeline.totalSec,
    accent,
    material: plan.style.material,
    titleFont: plan.style.title_font,
    captionFont: plan.style.caption_font,
    cutMotion: [],
    titles: [],
    kickers: [],
    plates: [],
    scans: [],
    occupants: [],
    comments: [],
    mudSplats: [],
    debris: [],
    mudWipes: [],
    flashes: [],
    shakes: [],
    captions: {
      y: CAPTION_Y,
      size: CAPTION_SIZE[plan.style.caption_font] ?? 80,
      groups: buildCaptionGroups(input.subtitleBlocks, input.highlightPhrases, until),
    },
    closing: {
      start: r3(until),
      end: r3(timeline.totalSec),
      brand: 'K-SI NUEVOS',
      place: 'CUENCA · ECUADOR',
      cta: plan.closing_cta,
    },
  }
  const sfx: { kind: SfxKind; at: number }[] = []

  // Movimiento de cámara en cada corte
  timeline.cuts.forEach((c, i) => {
    const motion =
      plan.style.cut_motion === 'mixto' ? ((i + Math.round(rnd())) % 2 === 0 ? 'golpe' : 'empuje') : plan.style.cut_motion
    data.cutMotion.push({ id: `cam${i}`, start: r3(c.start), end: r3(c.end), motion: i === 0 ? 'golpe' : motion })
  })

  // Gancho del segundo 0
  const first = timeline.cuts[0]
  const hookEnd = r3(Math.min(2.4, first ? first.visibleEnd + 0.3 : 2.4, until))
  const origin: [number, number] = [
    Math.round(((plan.hook.origin_x ?? 50) / 100) * W),
    Math.round(((plan.hook.origin_y ?? 80) / 100) * H),
  ]
  const hookSlot = slots.take('arriba', 0, hookEnd)!
  const hookTitle = {
    text: plan.hook.word,
    x: W / 2,
    y: SLOT_Y.arriba,
    size: TITLE_SIZE.grande,
    start: 0.12,
    end: hookEnd,
    entrance: plan.hook.entrance,
    seed: Math.floor(rnd() * 1000),
  }
  data.titles.push(hookTitle)
  hookSlot.hold.push(hookTitle)
  if (plan.hook.label) {
    const kicker = { text: plan.hook.label, x: W / 2, y: SLOT_Y.arriba - 150, start: 0.08, end: hookEnd }
    data.kickers.push(kicker)
    hookSlot.hold.push(kicker)
  }
  if (plan.hook.texture === 'barro') {
    data.mudSplats.push({ start: 0.04, end: r3(Math.min(1.9, hookEnd)), seed: Math.floor(rnd() * 1000) })
    data.debris.push({ origin, start: 0.02, seed: Math.floor(rnd() * 1000), count: 18, spread: 0.9 })
  } else if (plan.hook.texture === 'polvo') {
    data.debris.push({ origin, start: 0.02, seed: Math.floor(rnd() * 1000), count: 10, spread: 0.7 })
  } else {
    data.debris.push({ origin, start: 0.02, seed: Math.floor(rnd() * 1000), count: 34, spread: 1.2 })
  }
  sfx.push({ kind: 'whoosh', at: 0.05 }, { kind: 'impacto', at: 0.35 })

  // Beats de Claude, en orden de tiempo. Pueden seguir hasta 1 s después del corte (lo nuevo los saca antes).
  let scanIndex = 0
  const placed = input.plan.beats
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
    .filter((x): x is { b: MotionBeat; cut: CutTiming; start: number; end: number } => x != null)
    .sort((a, b) => a.start - b.start)

  for (const { b, cut, start, end } of placed) {
    switch (b.kind) {
      case 'transicion': {
        const at = r3(cut.start)
        if (at < 0.4 || at > until - 0.4) break
        if (b.transition === 'barro') {
          data.mudWipes.push({ at, seed: Math.floor(rnd() * 1000) })
          sfx.push({ kind: 'whoosh', at: r3(at - 0.18) })
        } else if (b.transition === 'destello') {
          data.flashes.push({ at })
          sfx.push({ kind: 'whoosh', at: r3(at - 0.1) })
        } else {
          data.shakes.push({ at })
          sfx.push({ kind: 'impacto', at })
        }
        break
      }
      case 'titulo_3d': {
        const taken = slots.take(b.slot ?? 'arriba', start, end)
        if (!taken) break
        const entrance = b.entrance ?? 'caer'
        const title = {
          text: b.text,
          x: W / 2,
          y: SLOT_Y[taken.slot],
          size: TITLE_SIZE[b.size ?? 'grande'],
          start,
          end,
          entrance,
          seed: Math.floor(rnd() * 1000),
        }
        data.titles.push(title)
        taken.hold.push(title)
        if (b.debris) {
          data.debris.push({ origin: [W / 2, SLOT_Y[taken.slot] + 60], start: r3(start + 0.12), seed: Math.floor(rnd() * 1000), count: 22, spread: 0.8 })
        }
        sfx.push({ kind: entrance === 'golpe' || entrance === 'caer' ? 'impacto' : 'whoosh', at: r3(start + (entrance === 'caer' ? 0.2 : 0.05)) })
        break
      }
      case 'placa': {
        const taken = slots.take(b.slot ?? 'centro', start, end)
        if (!taken) break
        const left = rnd() > 0.5
        const plate = {
          text: b.text,
          x: W / 2,
          y: SLOT_Y[taken.slot] - 50,
          start,
          end,
          rotate: left ? -3 : 2,
          from: left ? 'izquierda' : 'derecha',
          size: 54,
        }
        data.plates.push(plate)
        taken.hold.push(plate)
        sfx.push({ kind: 'pop', at: r3(start + 0.05) })
        break
      }
      case 'scan': {
        const px = Math.round(((b.point_x ?? 50) / 100) * W)
        const py = Math.round(((b.point_y ?? 50) / 100) * H)
        const labelY = b.screen ? py - 165 - 120 : Math.max(260, py - 260)
        const taken = slots.take(slotNear(labelY), start, end)
        if (!taken) break
        scanIndex++
        const scan = {
          index: scanIndex,
          label: b.text,
          point: b.screen ? null : ([px, py] as [number, number]),
          frame: b.screen ? ([Math.max(40, px - 260), Math.max(200, py - 165), 520, 330] as [number, number, number, number]) : null,
          start,
          end,
        }
        data.scans.push(scan)
        taken.hold.push(scan)
        sfx.push({ kind: 'pop', at: r3(start + 0.05) })
        break
      }
      case 'ocupantes': {
        if (b.count == null) break
        const taken = slots.take(b.slot ?? 'centro', start, end)
        if (!taken) break
        const y = SLOT_Y[taken.slot]
        const number = { text: String(b.count), x: 200, y, size: 260, start, end, entrance: b.entrance ?? 'golpe', seed: Math.floor(rnd() * 1000) }
        const plate = { text: b.text || 'OCUPANTES', x: 640, y: y - 150, start: r3(start + 0.1), end, rotate: -2, from: 'derecha', size: 46 }
        const people = { count: b.count, x: 360, y: y - 40, start: r3(start + 0.2), end }
        data.titles.push(number)
        data.plates.push(plate)
        data.occupants.push(people)
        taken.hold.push(number, plate, people)
        sfx.push({ kind: 'impacto', at: r3(start + 0.05) })
        break
      }
      case 'comentario': {
        // La caja necesita tiempo para escribirse: al menos 2,4 s.
        const boxEnd = r3(Math.max(end, Math.min(until, start + 2.4)))
        const taken = slots.take(b.slot ?? 'centro', start, boxEnd)
        if (!taken) break
        const comment = { text: b.text, y: SLOT_Y[taken.slot] - 70, start, end: boxEnd }
        data.comments.push(comment)
        taken.hold.push(comment)
        sfx.push({ kind: 'pop', at: r3(start + 0.05) })
        break
      }
    }
  }

  sfx.push({ kind: 'whoosh', at: r3(until - 0.1) })
  return { data, sfx }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function composeMotionReel(input: ComposeInput): { html: string; data: ReelData; timeline: ReelTimeline } {
  const timeline = computeReelTimeline(input.sequence)
  const { data, sfx } = buildReelData(input, timeline)

  const media: string[] = []
  const fileFor = (clip: number) => input.clipFiles.get(clip)
  let z = 1

  timeline.cuts.forEach((c, i) => {
    const f = fileFor(c.item.clip_index)
    if (!f) return
    const dur = r3(c.end - c.start)
    const mediaStart = r3(Math.max(0, c.sourceStart - f.rangeStartSec))
    // Donde el corte siguiente entra antes (solape, igual que en Shotstack) la voz sale con un fundido.
    const fadeOut = Math.max(0.12, r3(c.end - c.visibleEnd))
    const audio = f.hasAudio
      ? `data-has-audio="true" data-volume="${input.dialogueVolume.toFixed(3)}" data-fade-out="${fadeOut}"`
      : 'muted'
    media.push(
      `<div class="shot" style="z-index:${z++}"><div class="cam" id="cam${i}"><video id="v${i}" class="media clip" src="${attr(f.file)}" ` +
        `data-start="${r3(c.start)}" data-duration="${dur}" data-media-start="${mediaStart}" ${audio} playsinline></video></div></div>`
    )
    const ov = c.item.visual_overlay
    const of = ov ? fileFor(ov.clip_index) : undefined
    if (ov && of) {
      // B-roll encima del corte, con los mismos tiempos lineales que usa Shotstack.
      const linearStart = input.sequence.slice(0, i).reduce((a, it) => a + it.trim_duration, 0)
      media.push(
        `<div class="shot" style="z-index:${z++}"><div class="cam" id="camo${i}"><video id="o${i}" class="media clip" src="${attr(of.file)}" ` +
          `data-start="${r3(linearStart)}" data-duration="${r3(c.item.trim_duration)}" ` +
          `data-media-start="${r3(Math.max(0, ov.trim_start - of.rangeStartSec))}" muted playsinline></video></div></div>`
      )
    }
  })

  const tail = tailSource(timeline, input.clipDurationsSec)
  const tf = tail ? fileFor(tail.clip) : undefined
  if (tail && tf) {
    media.push(
      `<div class="shot" style="z-index:${z++}"><div class="cam"><video id="vtail" class="media clip" src="${attr(tf.file)}" ` +
        `data-start="${r3(timeline.contentSec)}" data-duration="${CLOSING_SEC}" ` +
        `data-media-start="${r3(Math.max(0, tail.start - tf.rangeStartSec))}" muted playsinline></video></div></div>`
    )
  }

  const audio: string[] = []
  if (input.music) {
    audio.push(
      `<audio id="music" class="clip" src="${attr(input.music.file)}" data-start="0" data-duration="${timeline.totalSec}" ` +
        `data-media-start="${r3(input.music.trimStartSec)}" data-volume="${input.music.volume.toFixed(3)}" data-fade-out="1.2"></audio>`
    )
  }
  sfx
    .filter((s) => input.sfxFiles[s.kind] && s.at >= 0 && s.at < timeline.totalSec - 0.3)
    .forEach((s, i) => {
      audio.push(
        `<audio id="sfx${i}" class="clip" src="${attr(input.sfxFiles[s.kind]!)}" data-start="${r3(s.at)}" data-duration="0.6" data-volume="0.4"></audio>`
      )
    })

  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="runtime/kit.css">
</head>
<body>
<div id="root" data-composition-id="root" data-width="${W}" data-height="${H}" data-duration="${timeline.totalSec}">
  <div id="world">
    ${media.join('\n    ')}
  </div>
  <div class="layer" id="fx"></div>
  <canvas id="stage3d" width="${W}" height="${H}"></canvas>
  <div class="layer" id="gfx"></div>
  <div class="layer" id="caps"></div>
  <div class="layer" id="top"></div>
  ${audio.join('\n  ')}
</div>
<script id="reel-data" type="application/json">${json}</script>
<script src="runtime/vendor/gsap.min.js"></script>
<script type="module" src="runtime/reel.js"></script>
</body>
</html>
`
  return { html, data, timeline }
}
