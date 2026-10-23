/**
 * Armado del formato familiar (SUV y autos de familia): ubica cada pieza del plan en el tiempo y en
 * pantalla, sin tapar la cara de la persona, y decide sus sonidos. Además pone el movimiento del video:
 * una transición en cada corte, zoom de golpe en las palabras clave y pulsos al ritmo de la música en
 * las tomas sin habla. Lo dibuja runtime/familiar.js.
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
  placeBeats,
  prng,
  r3,
  visualSegmentIds,
  type CaptionGroup,
  type CutTransition,
  type SlotName,
} from './compose-shared'
import { FAMILIAR_ACCENT_COLORS, type FamiliarPlan, type FamiliarTransition } from './formats/familiar'
import type { Entrance } from './plan-utils'

/** Zona donde pueden ir los gráficos: debajo de la barra de Instagram y encima de los subtítulos. */
const AREA = { top: 170, bottom: 1450 }
const TITLE_SIZE = { gigante: 250, grande: 190, mediano: 140 } as const

/**
 * Alto de cada pieza en pantalla (px, ya con la escala base del runtime). Si se cambia el diseño de
 * una pieza en familiar.js hay que actualizarlo aquí.
 */
const HEIGHT = {
  hookTitle: 230,
  hookChips: 80,
  dato: 200,
  contador: 281,
  tarjeta: 170,
  ruta: 482,
  whatsapp: 342,
  seguir: 170,
}

type Box = { top: number; scale: number; start: number; end: number; emoji: string | null }

export type FamiliarPiece =
  | (Box & { kind: 'chips'; items: string[]; layout: 'fila' | 'cascada' })
  | (Box & { kind: 'dato'; label: string; value: string })
  | (Box & { kind: 'contador'; label: string; value: string; unit: string; note: string })
  | (Box & { kind: 'tarjeta'; icon: string; title: string; text: string; side: 'derecha' | 'izquierda'; tap: [number, number] | null })
  | (Box & { kind: 'asientos'; count: number; title: string })
  | (Box & { kind: 'ruta'; title: string; text: string; stops: string[] })
  | (Box & { kind: 'whatsapp'; title: string; button: string })
  | (Box & { kind: 'seguir'; text: string })

export interface FamiliarData {
  format: 'familiar'
  duration: number
  accent: string
  finish: string
  cuts: { id: string; start: number; end: number }[]
  /** Transición de entrada de cada toma (#shot{i}). */
  transitions: CutTransition<FamiliarTransition>[]
  /** Zoom de golpe en palabras clave y pulsos al ritmo (segundos del Reel). */
  punches: number[]
  pulses: number[]
  titles: { text: string; x: number; y: number; size: number; start: number; end: number; entrance: Entrance; seed: number }[]
  leak: { start: number; end: number }
  pieces: FamiliarPiece[]
  captions: { groups: CaptionGroup[] }
  closing: { start: number; end: number; brand: string; place: string; line: string; button: string }
}

export function buildFamiliarData(input: ComposeInput, plan: FamiliarPlan, timeline: ReelTimeline): FormatBuild {
  const rnd = prng(input.seed)
  const until = timeline.contentSec
  const layout = new Layout(AREA)
  const sfx: SfxCue[] = []
  const at = (t: number) => r3(Math.max(0, t))
  let skipped = 0

  const data: FamiliarData = {
    format: 'familiar',
    duration: timeline.totalSec,
    accent: FAMILIAR_ACCENT_COLORS[plan.style.accent],
    finish: plan.style.finish,
    cuts: timeline.cuts.map((c, i) => ({ id: `cam${i}`, start: r3(c.start), end: r3(c.end) })),
    transitions: [],
    punches: [],
    pulses: [],
    titles: [],
    leak: { start: 0, end: 0 },
    pieces: [],
    captions: { groups: buildCaptionGroups(input.subtitleBlocks, input.highlightPhrases, until) },
    closing: {
      start: r3(until),
      end: r3(timeline.totalSec),
      brand: 'K-SI NUEVOS',
      place: 'CUENCA · ECUADOR',
      line: plan.closing_line || 'Agenda tu prueba de manejo',
      button: 'ESCRÍBENOS',
    },
  }

  const addTitle = (text: string, top: number, size: number, start: number, end: number, entrance: Entrance) => {
    const title = { text, x: W / 2, y: Math.round(top + size * 0.6), size, start, end, entrance, seed: Math.floor(rnd() * 1000) }
    data.titles.push(title)
    return title
  }

  // ── Gancho del segundo 0: modelo en 3D + chips + dato fuerte, todo dentro del primer corte
  const first = timeline.cuts[0]
  const hookEnd = r3(Math.min(3.6, first ? first.visibleEnd + 0.1 : 3.6, until))
  const hookFace = faceBandPx(plan.hook.face_top, plan.hook.face_bottom)
  data.leak = { start: 0, end: hookEnd }
  sfx.push({ kind: 'whoosh_soft', at: 0.02, volume: 0.55 }, { kind: 'shimmer', at: 0.15, volume: 0.3 })
  const titleSfx = (entrance: Entrance, start: number) => {
    if (entrance === 'letras') sfx.push({ kind: 'shimmer', at: start, volume: 0.3 }, { kind: 'pop_hi', at: r3(start + 0.4), volume: 0.4 })
    else if (entrance === 'fondo') sfx.push({ kind: 'whoosh_soft', at: at(start - 0.05), volume: 0.4 }, { kind: 'hit', at: r3(start + 0.5), volume: 0.35 })
    else sfx.push({ kind: 'hit', at: r3(start + (entrance === 'caer' ? 0.32 : 0.05)), volume: 0.45 })
  }
  const chips = plan.hook.chips
  const hookBlock = layout.place(HEIGHT.hookTitle + (chips.length ? HEIGHT.hookChips : 0), 0, hookEnd, { prefer: 'arriba', face: hookFace, cut: 0 })
  if (hookBlock) {
    const size = Math.round(200 * hookBlock.scale)
    hookBlock.hold.push(addTitle(plan.hook.word, hookBlock.top, size, 0.05, hookEnd, plan.hook.entrance))
    titleSfx(plan.hook.entrance, 0.05)
    if (chips.length) {
      const chipRow: FamiliarPiece = {
        kind: 'chips',
        items: chips,
        layout: 'fila',
        top: Math.round(hookBlock.top + HEIGHT.hookTitle * hookBlock.scale + 8),
        scale: hookBlock.scale,
        start: 0.45,
        end: hookEnd,
        emoji: null,
      }
      data.pieces.push(chipRow)
      hookBlock.hold.push(chipRow)
      chips.forEach((_, i) => sfx.push({ kind: 'pop', at: r3(0.45 + i * 0.12), volume: 0.5 }))
    }
  } else skipped++
  if (plan.hook.badge_value) {
    const badge = layout.place(HEIGHT.dato, 0.85, hookEnd, { prefer: 'abajo', face: hookFace, cut: 0 })
    if (badge) {
      const piece: FamiliarPiece = { kind: 'dato', label: plan.hook.badge_label ?? '', value: plan.hook.badge_value, ...box(badge, 0.85, hookEnd, '🔥') }
      data.pieces.push(piece)
      badge.hold.push(piece)
      sfx.push({ kind: 'pop_hi', at: 0.85, volume: 0.55 }, { kind: 'pop', at: 1.15, volume: 0.35 })
      countTicks(sfx, plan.hook.badge_value, 1.0)
    } else skipped++
  }

  // ── Beats de Claude
  const chosenTransitions = new Map<number, FamiliarTransition>()
  for (const { b, cut, start, end } of placeBeats(plan.beats, timeline, input.segments, until)) {
    const emoji = b.emoji
    if (emoji && b.kind !== 'transicion') sfx.push({ kind: 'pop', at: r3(start + 0.3), volume: 0.35 })
    const face = faceBandPx(b.face_top, b.face_bottom)
    const prefer: SlotName = b.slot ?? 'arriba'
    const put = (height: number, preferSlot: SlotName = prefer, endAt = end) => {
      const spot = layout.place(height, start, endAt, { prefer: preferSlot, face, cut: cut.index })
      if (!spot) skipped++
      return spot
    }
    switch (b.kind) {
      case 'transicion': {
        if (b.transition) chosenTransitions.set(cut.index, b.transition)
        break
      }
      case 'titulo_3d': {
        const size = TITLE_SIZE[b.size ?? 'grande']
        const spot = put(Math.round(size * 1.2))
        if (!spot) break
        const entrance = b.entrance ?? 'letras'
        spot.hold.push(addTitle(b.text, spot.top, Math.round(size * spot.scale), start, end, entrance))
        titleSfx(entrance, start)
        break
      }
      case 'dato': {
        const spot = put(HEIGHT.dato)
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'dato', label: b.label, value: b.text, ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push({ kind: 'pop_hi', at: r3(start + 0.05), volume: 0.55 })
        countTicks(sfx, b.text, start + 0.15)
        break
      }
      case 'contador': {
        const spot = put(HEIGHT.contador)
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'contador', label: b.label, value: b.text, unit: b.sub, note: b.note, ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push({ kind: 'whoosh_soft', at: at(start - 0.1), volume: 0.4 })
        const digits = b.text.replace(/\D/g, '').length
        for (let k = 0; k < digits + 3; k++) sfx.push({ kind: 'tick', at: r3(start + 0.24 + k * 0.075), volume: 0.28 })
        sfx.push({ kind: 'ding', at: r3(start + 1.0), volume: 0.45 })
        break
      }
      case 'tarjeta': {
        const spot = put(HEIGHT.tarjeta)
        if (!spot) break
        const tap = b.point_x != null && b.point_y != null ? ([Math.round((b.point_x / 100) * W), Math.round((b.point_y / 100) * H)] as [number, number]) : null
        const piece: FamiliarPiece = {
          kind: 'tarjeta',
          icon: b.icon ?? 'estrella',
          title: b.text,
          text: b.sub,
          side: tap && tap[0] > W / 2 ? 'izquierda' : 'derecha',
          tap,
          ...box(spot, start, end, emoji),
        }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push({ kind: 'click', at: r3(start + 0.05), volume: 0.6 })
        if (b.sub) sfx.push({ kind: 'typing', at: r3(start + 0.4), volume: 0.35 })
        if (tap) sfx.push({ kind: 'pop', at: r3(start + 0.45), volume: 0.35 })
        break
      }
      case 'etiquetas': {
        const spot = put(105 * b.items.length - 29)
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'chips', items: b.items, layout: 'cascada', ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        b.items.forEach((_, i) => sfx.push({ kind: 'pop', at: r3(start + i * 0.18), volume: 0.35 }))
        break
      }
      case 'asientos': {
        if (b.count == null) break
        const spot = put(seatsHeight(b.count), b.slot ?? 'centro')
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'asientos', count: b.count, title: b.text, ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        for (let i = 0; i < b.count; i++) sfx.push({ kind: 'pop_hi', at: r3(start + 0.25 + i * 0.17), volume: 0.4 })
        break
      }
      case 'ruta': {
        // La ruta necesita tiempo para dibujarse.
        const routeEnd = r3(Math.min(until, Math.max(end, start + 2.4)))
        const spot = put(HEIGHT.ruta, prefer, routeEnd)
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'ruta', title: b.text, text: b.sub, stops: b.items, ...box(spot, start, routeEnd, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push({ kind: 'whoosh_soft', at: r3(start + 0.1), volume: 0.3 }, { kind: 'ding', at: r3(start + 1.8), volume: 0.4 })
        break
      }
      case 'whatsapp': {
        const spot = put(HEIGHT.whatsapp, b.slot ?? 'abajo')
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'whatsapp', title: b.text, button: b.sub, ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        // Subida antes del llamado, entrada con golpe y el toque al botón
        if (start > 1.3) sfx.push({ kind: 'riser', at: r3(start - 1.15), volume: 0.28 })
        sfx.push(
          { kind: 'whoosh', at: at(start - 0.03), volume: 0.35 },
          { kind: 'hit', at: r3(start + 0.05), volume: 0.3 },
          { kind: 'pop', at: r3(start + 0.45), volume: 0.4 },
          { kind: 'click', at: r3(start + 1.1), volume: 0.6 }
        )
        break
      }
      case 'seguir': {
        const spot = put(HEIGHT.seguir)
        if (!spot) break
        const piece: FamiliarPiece = { kind: 'seguir', text: b.text, ...box(spot, start, end, emoji) }
        data.pieces.push(piece)
        spot.hold.push(piece)
        sfx.push(
          { kind: 'click', at: r3(start + 0.68), volume: 0.55 },
          { kind: 'pop_hi', at: r3(start + 0.8), volume: 0.55 },
          { kind: 'pop', at: r3(start + 0.95), volume: 0.3 },
          { kind: 'pop', at: r3(start + 1.1), volume: 0.25 }
        )
        break
      }
    }
  }

  // Las letras 3D salen volando (con su soplido); va al final porque lo nuevo puede adelantar su salida.
  for (const t of data.titles) if (t.end - t.start > 1) sfx.push({ kind: 'whoosh', at: at(t.end - 0.38), volume: 0.22 })

  // ── Movimiento del video: transición en cada corte, zoom en palabras clave y pulsos al ritmo
  const visual = visualSegmentIds(input.segments)
  data.transitions = cutTransitions<FamiliarTransition>(timeline, {
    chosen: chosenTransitions,
    rotation: ['zoom', 'barrido', 'circulo', 'destello', 'luz'],
    forVisual: 'foto',
    visualSegments: visual,
    rnd,
  })
  for (const tr of data.transitions) sfx.push(...TRANSITION_SFX[tr.kind](tr.at))
  data.punches = keywordPunches(data.captions.groups, timeline.cuts.map((c) => c.start), until)
  for (const t of data.punches) sfx.push({ kind: 'thump', at: t, volume: 0.38 })
  data.pulses = beatPulses(input.beats ?? [], timeline, visual)
  // Pop en cada palabra clave que se dice (las cifras además cuentan en el subtítulo)
  let lastPop = -1
  for (const g of data.captions.groups) {
    for (const w of g.words) {
      if (!w.key || w.start - lastPop < 0.3) continue
      sfx.push({ kind: 'pop_hi', at: r3(w.start), volume: 0.28 })
      lastPop = w.start
    }
  }

  // ── Cierre
  sfx.push(
    ...(until > 1.5 ? [{ kind: 'riser' as const, at: r3(until - 1.25), volume: 0.28 }] : []),
    { kind: 'whoosh_soft', at: at(until - 0.15), volume: 0.5 },
    { kind: 'hit', at: r3(until + 0.12), volume: 0.4 },
    { kind: 'shimmer', at: r3(until + 0.1), volume: 0.35 },
    { kind: 'pop', at: r3(until + 0.35), volume: 0.4 }
  )

  return {
    data,
    sfx,
    summary:
      `formato familiar: ${data.titles.length} títulos 3D, ${data.pieces.length} piezas` +
      `${skipped ? ` (${skipped} sin espacio libre junto a la cara)` : ''}, ` +
      `${data.transitions.length} transiciones, ${data.punches.length} zooms, ${data.pulses.length} pulsos, ` +
      `${data.captions.groups.length} subtítulos, ${sfx.length} sonidos`,
  }
}

/** Tarjeta de asientos: adelante 2 y atrás filas de 3 (escala base 0,85). */
function seatsHeight(count: number): number {
  const rows = 1 + Math.ceil((count - 2) / 3)
  return Math.round((150 + rows * 175) * 0.85)
}

function box(spot: { top: number; scale: number }, start: number, end: number, emoji: string | null = null) {
  return { top: spot.top, scale: spot.scale, start, end, emoji }
}

/** Sonidos de cada transición (at = inicio de la toma nueva). */
const TRANSITION_SFX: Record<FamiliarTransition, (at: number) => SfxCue[]> = {
  zoom: (t) => [{ kind: 'whoosh', at: r3(Math.max(0, t - 0.1)), volume: 0.4 }, { kind: 'thump', at: t, volume: 0.45 }],
  barrido: (t) => [{ kind: 'whoosh', at: r3(Math.max(0, t - 0.14)), volume: 0.45 }],
  circulo: (t) => [{ kind: 'whoosh_soft', at: r3(Math.max(0, t - 0.1)), volume: 0.45 }, { kind: 'pop', at: r3(t + 0.25), volume: 0.3 }],
  destello: (t) => [{ kind: 'pop_hi', at: t, volume: 0.35 }, { kind: 'shimmer', at: t, volume: 0.2 }],
  luz: (t) => [{ kind: 'whoosh_soft', at: r3(Math.max(0, t - 0.2)), volume: 0.45 }],
  brillo: (t) => [{ kind: 'shimmer', at: t, volume: 0.3 }],
  foto: (t) => [{ kind: 'shutter', at: r3(Math.max(0, t - 0.02)), volume: 0.6 }],
}

/** Tics mientras una cifra cuenta hasta su valor (si el texto empieza con una cifra). */
function countTicks(sfx: SfxCue[], text: string, from: number) {
  if (!/^\d/.test(text)) return
  for (let k = 0; k < 6; k++) sfx.push({ kind: 'tick', at: r3(from + k * 0.09), volume: 0.25 })
}
