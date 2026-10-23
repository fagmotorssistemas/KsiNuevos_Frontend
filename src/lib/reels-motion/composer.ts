/**
 * Compositor Motion 3D: convierte el montaje (cortes), los subtítulos y el plan de movimiento de Claude
 * en una composición HyperFrames (index.html). Aquí se resuelven todos los tiempos absolutos y las
 * posiciones; el runtime del navegador (reels-motion/runtime/) solo dibuja lo que recibe.
 *
 * Los cortes se ubican igual que en Shotstack (computeReelClipStartSec), así los subtítulos ya
 * calculados por el pipeline quedan sincronizados sin tocarlos.
 *
 * Este archivo arma el formato camioneta y el HTML común; los formatos familiar y premium tienen su
 * propio armado en compose-familiar.ts y compose-premium.ts.
 */

import type { Segment, SequenceItem, SubtitleBlock } from '@/lib/videos/segmenter'
import { computeReelClipStartSec } from '@/lib/videos/reel-timeline'
import {
  ACCENT_COLORS,
  type CamionetaPlan,
  type Entrance,
  type MotionFormat,
  type MotionPlan,
  type Slot,
} from './motion-plan'
import {
  H,
  MIN_ON_SCREEN,
  W,
  buildCaptionGroups,
  faceBandPx,
  overlaps,
  placeBeats,
  prng,
  r3,
  type Band,
  type Timed,
} from './compose-shared'
import { buildFamiliarData } from './compose-familiar'
import { buildPremiumData } from './compose-premium'

/** Cierre K-SI NUEVOS que se agrega después del último corte. */
export const CLOSING_SEC = 2.4
const CAPTION_Y = 1430
/** Tamaño de subtítulo por tipografía (Montserrat y Russo son más anchas que Anton). */
const CAPTION_SIZE: Record<string, number> = { anton: 92, russo: 72, montserrat: 64 }

const SLOT_Y: Record<Slot, number> = { arriba: 330, centro: 800, abajo: 1180 }
/** Alto que ocupa cada franja (títulos grandes y placas), para no ponerla sobre una cara. */
const SLOT_BAND: Record<Slot, Band> = {
  arriba: { top: 190, bottom: 470 },
  centro: { top: 660, bottom: 940 },
  abajo: { top: 1040, bottom: 1320 },
}
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

/**
 * Tramos del Reel sin voz (tomas SOLO PLANO y el cierre): ahí la música sube para que no se sienta vacío.
 */
export function musicSwellRanges(timeline: ReelTimeline, segments: Segment[]): [number, number][] {
  const visual = new Set(segments.filter((s) => s.source_kind === 'visual_only').map((s) => s.segment_id))
  const ranges: [number, number][] = timeline.cuts
    .filter((c) => visual.has(c.item.segment_id) && c.visibleEnd - c.start > 0.6)
    .map((c) => [c.start, c.visibleEnd])
  ranges.push([timeline.contentSec, timeline.totalSec])
  return ranges
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

export interface CamionetaData {
  format: 'camioneta'
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

/**
 * Efectos de sonido. whoosh, pop e impacto son los de la biblioteca de K-SI (camioneta); el resto viene
 * con el motor (reels-motion/sfx) y los usan los formatos familiar y premium.
 */
export const SFX_KINDS = [
  'whoosh',
  'pop',
  'impacto',
  'whoosh_soft',
  'pop_hi',
  'click',
  'ding',
  'shimmer',
  'tick',
  'boom',
  'thump',
  'shutter',
  'typing',
  'hit',
  'riser',
] as const
export type SfxKind = (typeof SFX_KINDS)[number]
/** Duración de cada efecto en la composición (s). */
const SFX_LEN: Record<SfxKind, number> = {
  whoosh: 0.6,
  pop: 0.6,
  impacto: 0.6,
  whoosh_soft: 0.85,
  pop_hi: 0.15,
  click: 0.05,
  ding: 1.6,
  shimmer: 2,
  tick: 0.05,
  boom: 2.4,
  thump: 0.5,
  shutter: 0.35,
  typing: 0.9,
  hit: 0.9,
  riser: 1.4,
}
export type SfxCue = { kind: SfxKind; at: number; volume?: number }

/** Lo que arma cada formato: datos para su runtime, efectos y un resumen para el log. */
export interface FormatBuild {
  data: { duration: number }
  sfx: SfxCue[]
  summary: string
}

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
  /** Golpes de la música en segundos del Reel (music-beats.ts); vacío si la pista no tiene pulso claro. */
  beats?: number[]
}

export function seedFromId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Reparto de las tres franjas (arriba, centro, abajo) para que dos gráficos no se encimen.
 * Lo nuevo manda: si la franja la ocupa algo que ya se vio lo suficiente, eso sale cuando entra lo nuevo.
 */
class SlotBook {
  private used: { slot: Slot; start: number; end: number; pieces: Timed[] }[] = []
  /** `face` = cabeza de la persona en el corte: las franjas que la pisan no se usan. */
  take(preferred: Slot, start: number, end: number, face: Band | null = null): { slot: Slot; hold: Timed[] } | null {
    for (const slot of [preferred, ...SLOT_ORDER.filter((x) => x !== preferred)]) {
      if (face && overlaps(face, SLOT_BAND[slot])) continue
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

function buildCamionetaData(input: ComposeInput, plan: CamionetaPlan, timeline: ReelTimeline): FormatBuild {
  const rnd = prng(input.seed)
  const accent = ACCENT_COLORS[plan.style.accent]
  const slots = new SlotBook()
  const until = timeline.contentSec

  const data: CamionetaData = {
    format: 'camioneta',
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
  const sfx: SfxCue[] = []

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
  // Si la cara del primer corte está arriba, el gancho baja a la franja libre.
  const hookSlot = slots.take('arriba', 0, hookEnd, faceBandPx(plan.hook.face_top, plan.hook.face_bottom)) ?? slots.take('arriba', 0, hookEnd)!
  const hookTitle = {
    text: plan.hook.word,
    x: W / 2,
    y: SLOT_Y[hookSlot.slot],
    size: TITLE_SIZE.grande,
    start: 0.12,
    end: hookEnd,
    entrance: plan.hook.entrance,
    seed: Math.floor(rnd() * 1000),
  }
  data.titles.push(hookTitle)
  hookSlot.hold.push(hookTitle)
  if (plan.hook.label) {
    const kicker = { text: plan.hook.label, x: W / 2, y: SLOT_Y[hookSlot.slot] - 150, start: 0.08, end: hookEnd }
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
  const placed = placeBeats(plan.beats, timeline, input.segments, until)

  for (const { b, cut, start, end } of placed) {
    const face = faceBandPx(b.face_top, b.face_bottom)
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
        const taken = slots.take(b.slot ?? 'arriba', start, end, face)
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
        const taken = slots.take(b.slot ?? 'centro', start, end, face)
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
        const taken = slots.take(b.slot ?? 'centro', start, end, face)
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
        const taken = slots.take(b.slot ?? 'centro', start, boxEnd, face)
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
  return {
    data,
    sfx,
    summary:
      `${data.titles.length} títulos 3D, ${data.plates.length} placas, ${data.scans.length} scans, ` +
      `${data.mudWipes.length + data.flashes.length + data.shakes.length} transiciones, ${data.captions.groups.length} subtítulos`,
  }
}

/** Datos del runtime según el formato del plan. */
export function buildFormatData(input: ComposeInput, timeline: ReelTimeline): FormatBuild {
  const { plan } = input
  if (plan.format === 'familiar') return buildFamiliarData(input, plan, timeline)
  if (plan.format === 'premium') return buildPremiumData(input, plan, timeline)
  return buildCamionetaData(input, plan, timeline)
}

/** Hoja de estilos y script de cada formato (dentro de runtime/). */
const RUNTIME_ENTRY: Record<MotionFormat, { css: string[]; script: string }> = {
  camioneta: { css: ['kit.css'], script: 'reel.js' },
  familiar: { css: ['kit.css', 'familiar.css'], script: 'familiar.js' },
  premium: { css: ['kit.css', 'premium.css'], script: 'premium.js' },
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function composeMotionReel(input: ComposeInput): { html: string; summary: string; timeline: ReelTimeline } {
  const timeline = computeReelTimeline(input.sequence)
  const { data, sfx, summary } = buildFormatData(input, timeline)
  const entry = RUNTIME_ENTRY[input.plan.format]

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
      `<div class="shot" id="shot${i}" style="z-index:${z++}"><div class="cam" id="cam${i}"><video id="v${i}" class="media clip" src="${attr(f.file)}" ` +
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
        `<audio id="sfx${i}" class="clip" src="${attr(input.sfxFiles[s.kind]!)}" data-start="${r3(s.at)}" ` +
          `data-duration="${SFX_LEN[s.kind]}" data-volume="${(s.volume ?? 0.4).toFixed(2)}"></audio>`
      )
    })

  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${entry.css.map((f) => `<link rel="stylesheet" href="runtime/${f}">`).join('\n')}
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
<script type="module" src="runtime/${entry.script}"></script>
</body>
</html>
`
  return { html, summary, timeline }
}
