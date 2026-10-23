/**
 * Armado del formato premium (autos de lujo): ubica cada pieza del plan en el tiempo y en pantalla,
 * sin tapar la cara de la persona, y decide sus sonidos. Además pone el movimiento del video: una
 * transición en cada corte, un acercamiento suave en las palabras clave y pulsos al ritmo en las
 * tomas sin habla. Lo dibuja runtime/premium.js.
 */

import type { ComposeInput, FormatBuild, ReelTimeline, SfxCue } from './composer'
import {
  H,
  Layout,
  W,
  beatPulses,
  buildCaptionGroups,
  cutTransitions,
  faceBandPx,
  keywordPunches,
  overlaps,
  placeBeats,
  prng,
  r3,
  visualSegmentIds,
  type Band,
  type CaptionGroup,
  type CutTransition,
  type SlotName,
} from './compose-shared'
import { PREMIUM_ACCENT_COLORS, type PremiumPlan, type PremiumTransition } from './formats/premium'
import type { Entrance } from './plan-utils'

/** Franjas de cine de 150 px arriba y abajo; los subtítulos van desde 1530. */
const AREA = { top: 190, bottom: 1480 }
const BAR = 150
const CIFRA_SIZE = { gigante: 300, grande: 210, mediano: 150 } as const

/** Alto de cada pieza (px). Si se cambia el diseño en premium.js hay que actualizarlo aquí. */
const HEIGHT = {
  hook: 510,
  ficha: 230,
  frase: 250,
  dupla: 330,
  dial: 420,
  cita: 345,
  agenda: 170,
}
const SENAL_LABEL = { w: 470, h: 130 }

type Box = { top: number; scale: number; start: number; end: number }

export type PremiumPiece =
  | (Box & { kind: 'hook'; kicker: string | null; tagline: string | null })
  | (Box & { kind: 'cifra'; label: string; sub: string; size: number })
  | (Box & { kind: 'ficha'; label: string; text: string; sub: string })
  | { kind: 'senal'; label: string; text: string; dot: [number, number]; box: [number, number]; line: [number, number]; start: number; end: number }
  | (Box & { kind: 'frase'; text: string; sub: string })
  | (Box & { kind: 'dupla'; text: string; sub: string })
  | (Box & { kind: 'dial'; text: string; label: string })
  | (Box & { kind: 'cita'; text: string; sub: string })
  | (Box & { kind: 'agenda'; label: string; text: string })

export interface PremiumData {
  format: 'premium'
  duration: number
  accent: string
  light: string
  deep: string
  cuts: { id: string; start: number; end: number }[]
  /** Fundido a negro corto entre tomas y largo en las transiciones "negro". */
  dips: number[]
  blacks: number[]
  /** Transición de entrada de cada toma (#shot{i}), además del fundido corto. */
  transitions: CutTransition<PremiumTransition>[]
  /** Acercamiento suave en palabras clave y pulsos al ritmo (segundos del Reel). */
  punches: number[]
  pulses: number[]
  sweeps: { at: number; top: number; height: number }[]
  titles: {
    text: string
    x: number
    y: number
    size: number
    start: number
    end: number
    entrance: Entrance
    seed: number
    finish: string
    spacing: number
  }[]
  pieces: PremiumPiece[]
  /** Sombra degradada detrás de los textos grandes (se leen sobre un showroom claro). */
  shades: { top: number; height: number; dir: 'abajo' | 'arriba'; start: number; end: number; alpha: number }[]
  captions: { groups: CaptionGroup[] }
  closing: { start: number; end: number; brand: string; line: string; place: string }
}

export function buildPremiumData(input: ComposeInput, plan: PremiumPlan, timeline: ReelTimeline): FormatBuild {
  const rnd = prng(input.seed)
  const until = timeline.contentSec
  const layout = new Layout(AREA)
  const sfx: SfxCue[] = []
  const [accent, light, deep] = PREMIUM_ACCENT_COLORS[plan.style.accent]
  let skipped = 0

  const data: PremiumData = {
    format: 'premium',
    duration: timeline.totalSec,
    accent,
    light,
    deep,
    cuts: timeline.cuts.map((c, i) => ({ id: `cam${i}`, start: r3(c.start), end: r3(c.end) })),
    dips: [],
    blacks: [],
    transitions: [],
    punches: [],
    pulses: [],
    sweeps: [],
    titles: [],
    pieces: [],
    shades: [],
    captions: { groups: [] },
    closing: {
      start: r3(until),
      end: r3(timeline.totalSec),
      brand: 'K-SI NUEVOS',
      line: plan.closing_line || 'Agenda una visita privada',
      place: 'CUENCA · ECUADOR',
    },
  }

  /** Sombra que sube desde abajo o baja desde arriba según dónde esté el texto. */
  const shade = (top: number, height: number, start: number, end: number, alpha = 0.65) => {
    const s =
      top + height / 2 < H / 2
        ? { top: BAR, height: Math.min(H - 2 * BAR, top + height + 200 - BAR), dir: 'abajo' as const }
        : { top: Math.max(BAR, top - 200), height: H - BAR - Math.max(BAR, top - 200), dir: 'arriba' as const }
    data.shades.push({ ...s, start, end, alpha })
    return data.shades[data.shades.length - 1]!
  }


  // ── Gancho del segundo 0: marca + modelo en 3D + frase corta
  const first = timeline.cuts[0]
  const hookEnd = r3(Math.min(3.2, first ? first.visibleEnd + 0.05 : 3.2, until))
  const hookSpot = layout.place(HEIGHT.hook, 0, hookEnd, { prefer: 'arriba', face: faceBandPx(plan.hook.face_top, plan.hook.face_bottom), cut: 0 })
  sfx.push({ kind: 'boom', at: 0, volume: 0.7 })
  if (hookSpot) {
    const { top, scale } = hookSpot
    const hook: PremiumPiece = { kind: 'hook', kicker: plan.hook.kicker, tagline: plan.hook.tagline, top, scale, start: 0, end: hookEnd }
    const title = {
      text: plan.hook.word,
      x: W / 2,
      y: Math.round(top + 250 * scale),
      size: Math.round(230 * scale),
      start: 0.1,
      end: hookEnd,
      entrance: plan.hook.entrance,
      seed: Math.floor(rnd() * 1000),
      finish: plan.style.finish,
      spacing: 0.03,
    }
    data.pieces.push(hook)
    data.titles.push(title)
    hookSpot.hold.push(hook, title, shade(top, HEIGHT.hook * scale, 0, hookEnd))
    data.sweeps.push({ at: 0.95, top: Math.round(top + 120 * scale), height: 260 })
    sfx.push({ kind: 'shimmer', at: 0.95, volume: 0.4 })
  } else skipped++

  // ── Beats de Claude
  const chosenTransitions = new Map<number, PremiumTransition>()
  for (const { b, cut, start, end } of placeBeats(plan.beats, timeline, input.segments, until)) {
    const face = faceBandPx(b.face_top, b.face_bottom)
    const prefer: SlotName = b.slot ?? 'arriba'
    const put = (height: number, preferSlot: SlotName = prefer) => {
      const spot = layout.place(height, start, end, { prefer: preferSlot, face, cut: cut.index })
      if (!spot) skipped++
      return spot
    }
    switch (b.kind) {
      case 'transicion': {
        if (b.transition) chosenTransitions.set(cut.index, b.transition)
        break
      }
      case 'titulo_3d': {
        const size = CIFRA_SIZE[b.size ?? 'gigante']
        const spot = put(Math.round(size * 1.5))
        if (!spot) break
        const s = Math.round(size * spot.scale)
        const piece: PremiumPiece = { kind: 'cifra', label: b.label, sub: b.sub, size: s, ...box(spot, start, end) }
        const title = {
          text: b.text,
          x: W / 2,
          y: Math.round(spot.top + 70 * spot.scale + s * 0.5),
          size: s,
          start: r3(start + 0.15),
          end,
          entrance: (size >= 250 ? 'golpe' : 'fondo') as Entrance,
          seed: Math.floor(rnd() * 1000),
          finish: b.finish ?? 'oro_pulido',
          spacing: 0,
        }
        data.pieces.push(piece)
        data.titles.push(title)
        spot.hold.push(piece, title)
        sfx.push({ kind: 'boom', at: r3(start + 0.15), volume: 0.45 }, { kind: 'shimmer', at: r3(start + 0.2), volume: 0.35 })
        break
      }
      case 'ficha': {
        const spot = put(HEIGHT.ficha)
        if (!spot) break
        const piece: PremiumPiece = { kind: 'ficha', label: b.label, text: b.text, sub: b.sub, ...box(spot, start, end) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push({ kind: 'shimmer', at: r3(start + 0.1), volume: 0.25 })
        break
      }
      case 'senal': {
        const piece = placeSenal(layout, b.point_x!, b.point_y!, b.label, b.text, start, end, face, cut.index)
        if (!piece) {
          skipped++
          break
        }
        data.pieces.push(piece.piece)
        piece.hold.push(piece.piece)
        sfx.push({ kind: 'tick', at: r3(start + 0.05), volume: 0.35 })
        break
      }
      case 'frase':
      case 'cita':
      case 'dupla': {
        // La frase es de su toma: no sigue en la siguiente (ahí ya se habla de otra cosa y vuelve el subtítulo).
        const ownEnd = r3(Math.max(start + 1, Math.min(end, cut.visibleEnd + 0.3)))
        const spot = layout.place(HEIGHT[b.kind], start, ownEnd, { prefer, face, cut: cut.index })
        if (!spot) {
          skipped++
          break
        }
        const piece: PremiumPiece = { kind: b.kind, text: b.text, sub: b.sub, ...box(spot, start, ownEnd) }
        data.pieces.push(piece)
        spot.hold.push(piece, shade(spot.top, HEIGHT[b.kind] * spot.scale, start, ownEnd, b.kind === 'dupla' ? 0.55 : 0.7))
        if (b.kind === 'cita') {
          data.sweeps.push({ at: r3(start + 0.95), top: Math.round(spot.top + 150 * spot.scale), height: 260 })
          sfx.push({ kind: 'shimmer', at: r3(start + 0.95), volume: 0.3 })
        } else sfx.push({ kind: 'shimmer', at: r3(start + (b.kind === 'frase' ? 0.4 : 0.75)), volume: 0.28 })
        break
      }
      case 'dial': {
        const spot = put(HEIGHT.dial)
        if (!spot) break
        const piece: PremiumPiece = { kind: 'dial', text: b.text, label: b.label, ...box(spot, start, end) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        for (let k = 0; k < 12; k++) {
          const t = start + 0.2 + k * 0.15
          if (t < end - 0.2) sfx.push({ kind: 'tick', at: r3(t), volume: 0.22 })
        }
        break
      }
      case 'agenda': {
        const spot = put(HEIGHT.agenda)
        if (!spot) break
        const piece: PremiumPiece = { kind: 'agenda', label: b.label, text: b.text, ...box(spot, start, end) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        // Subida antes del llamado
        if (start > 1.3) sfx.push({ kind: 'riser', at: r3(start - 1.15), volume: 0.25 })
        sfx.push({ kind: 'shimmer', at: start, volume: 0.3 }, { kind: 'hit', at: r3(start + 0.05), volume: 0.25 })
        break
      }
    }
  }

  // Las frases grandes ya dicen lo mismo que el subtítulo: mientras están, no hay subtítulo.
  const statements = data.pieces.filter((p) => p.kind === 'frase' || p.kind === 'dupla' || p.kind === 'cita')
  data.captions.groups = buildCaptionGroups(input.subtitleBlocks, input.highlightPhrases, until).filter((g) => {
    const mid = (g.start + g.end) / 2
    return !statements.some((p) => mid >= p.start - 0.15 && mid <= p.end)
  })

  // ── Movimiento del video: fundido corto en cada toma + su transición, acercamiento en palabras clave
  // y pulsos al ritmo en las tomas sin habla
  const visual = visualSegmentIds(input.segments)
  data.transitions = cutTransitions<PremiumTransition>(timeline, {
    chosen: chosenTransitions,
    rotation: ['desenfoque', 'pelicula', 'zoom_suave'],
    visualSegments: visual,
    rnd,
  })
  for (const tr of data.transitions) {
    if (tr.kind === 'negro') {
      data.blacks.push(tr.at)
      sfx.push({ kind: 'boom', at: r3(tr.at - 0.05), volume: 0.35 })
      continue
    }
    data.dips.push(tr.at)
    sfx.push({ kind: 'whoosh_soft', at: r3(Math.max(0, tr.at - 0.25)), volume: 0.22 })
    if (tr.kind === 'barrido') {
      data.sweeps.push({ at: tr.at, top: 0, height: H })
      sfx.push({ kind: 'shimmer', at: tr.at, volume: 0.35 })
    } else if (tr.kind === 'pelicula') sfx.push({ kind: 'shimmer', at: tr.at, volume: 0.18 })
  }
  data.punches = keywordPunches(data.captions.groups, timeline.cuts.map((c) => c.start), until)
  data.pulses = beatPulses(input.beats ?? [], timeline, visual)
  // Tic de reloj suave en cada palabra clave del subtítulo
  let lastTick = -1
  for (const g of data.captions.groups) {
    for (const w of g.words) {
      if (!w.key || w.start - lastTick < 0.35) continue
      sfx.push({ kind: 'tick', at: r3(w.start), volume: 0.2 })
      lastTick = w.start
    }
  }

  // ── Cierre
  sfx.push(
    ...(until > 1.5 ? [{ kind: 'riser' as const, at: r3(until - 1.3), volume: 0.25 }] : []),
    { kind: 'boom', at: r3(Math.max(0, until - 0.05)), volume: 0.6 },
    { kind: 'shimmer', at: r3(until + 0.6), volume: 0.3 },
    { kind: 'ding', at: r3(until + 0.4), volume: 0.3 }
  )

  return {
    data,
    sfx,
    summary:
      `formato premium: ${data.titles.length} títulos 3D, ${data.pieces.length} piezas` +
      `${skipped ? ` (${skipped} sin espacio libre junto a la cara)` : ''}, ` +
      `${data.transitions.length} transiciones, ${data.punches.length} acercamientos, ${data.pulses.length} pulsos, ` +
      `${data.captions.groups.length} subtítulos, ${sfx.length} sonidos`,
  }
}

function box(spot: { top: number; scale: number }, start: number, end: number) {
  return { top: spot.top, scale: spot.scale, start, end }
}

/** Señal: punto sobre lo que se ve y la etiqueta arriba o abajo, del lado con más espacio. */
function placeSenal(
  layout: Layout,
  pxPct: number,
  pyPct: number,
  label: string,
  text: string,
  start: number,
  end: number,
  face: Band | null,
  cut: number
) {
  const px = Math.round((pxPct / 100) * W)
  const py = Math.round((pyPct / 100) * H)
  const lx = px < W / 2 ? Math.min(px + 40, W - 60 - SENAL_LABEL.w) : Math.max(60, px - 40 - SENAL_LABEL.w)
  for (const above of [true, false]) {
    const ly = above ? py - 240 : py + 110
    const band = { top: ly, bottom: ly + SENAL_LABEL.h }
    if (band.top < AREA.top || band.bottom > AREA.bottom) continue
    if (face && overlaps(face, band)) continue
    const hold = layout.reserve({ top: Math.min(ly, py - 20), bottom: Math.max(ly + SENAL_LABEL.h, py + 20) }, start, end, cut)
    if (!hold) continue
    // La línea va del punto a la esquina de la etiqueta más cercana.
    const ax = lx > px ? lx : lx + SENAL_LABEL.w
    const ay = above ? ly + SENAL_LABEL.h : ly
    const len = Math.round(Math.hypot(ax - px, ay - py))
    const angle = r3((Math.atan2(ay - py, ax - px) * 180) / Math.PI)
    const piece: PremiumPiece = { kind: 'senal', label, text, dot: [px, py], box: [lx, ly], line: [len, angle], start, end }
    return { piece, hold }
  }
  return null
}
