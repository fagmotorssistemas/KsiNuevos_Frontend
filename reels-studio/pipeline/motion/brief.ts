/**
 * Guion para Claude como director de motion graphics: el montaje ya decidido (tomas, teaser, momentos de los
 * gráficos con su texto y dónde está cada objeto, subtítulos) en segundos del Reel, más cuadros del video en los
 * momentos clave para que vea qué hay en pantalla.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReelProps, ScreenFocus, TimelineGraphic } from '../../src/plan/types'
import { formatVehicle, type VehicleInfo } from '../director-prompt'
import type { MotionDesign } from './compose'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const s = (frames: number, fps: number) => (frames / fps).toFixed(2)
const box = (f: ScreenFocus) => `centro (${Math.round(f.cx)}, ${Math.round(f.cy)}) px, ${Math.round(f.w)}×${Math.round(f.h)} px`

/** Marcas que van con el diseño súper premium, sin importar la carrocería. */
const PREMIUM_BRANDS = /mercedes|bmw|audi|porsche|lexus|land ?rover|range ?rover|volvo|jaguar|maserati|tesla|genesis|infiniti|cadillac|lincoln|alfa ?romeo|bentley|ferrari|lamborghini/i

/** Diseño de motion graphics según el vehículo: marca de lujo → premium; si no, por tipo. */
export function motionDesignFor(v: VehicleInfo): MotionDesign {
  if (PREMIUM_BRANDS.test(v.marca ?? '')) return 'premium'
  if (v.categoria === 'camioneta') return 'camioneta'
  if (v.categoria === 'suv') return 'suv'
  if (v.categoria === 'deportivo') return 'deportivo'
  return 'general'
}

function graphicLine(g: TimelineGraphic, fps: number): string {
  const start = g.fromFrame / fps
  const end = (g.fromFrame + g.durationInFrames) / fps
  const fields: string[] = []
  if (g.text) fields.push(`texto "${g.text}"`)
  if (g.subtext) fields.push(`subtexto "${g.subtext}"`)
  if (g.badge) fields.push(`insignia "${g.badge}"`)
  if (g.items?.length) fields.push(`ítems ${JSON.stringify(g.items)}`)
  if (g.value !== undefined) fields.push(`valor ${g.value}`)
  if (g.prefix) fields.push(`prefijo "${g.prefix}"`)
  if (g.unit) fields.push(`unidad "${g.unit}"`)
  if (g.icon) fields.push(`ícono ${g.icon}`)
  if (g.variant) fields.push(`variante ${g.variant}`)
  if (g.placement) fields.push(`lugar ${g.placement}`)
  if (g.zoom) {
    fields.push(`el objeto está en ${box(g.zoom.focus)}`)
    if (g.zoom.focusEnd) fields.push(`y termina en ${box(g.zoom.focusEnd)} (la cámara del clip se mueve)`)
    fields.push(`acercamiento sugerido: escala ${g.zoom.scale.toFixed(2)} llevando el objeto a (${Math.round(g.zoom.target.x)}, ${Math.round(g.zoom.target.y)}) px`)
  }
  if (g.cardAtTop !== undefined) fields.push(`tarjeta ${g.cardAtTop ? 'arriba' : 'abajo'} (los subtítulos van al otro lado)`)
  return `- ${g.id} · ${g.type} · ${start.toFixed(2)}–${end.toFixed(2)} s · ${fields.join(' · ')}`
}

/** Texto del guion: vehículo, diseño, tomas, teaser, gráficos y subtítulos. */
export function briefText(props: ReelProps, vehicle: VehicleInfo, design: MotionDesign): string {
  const fps = props.fps
  const cuts = props.cuts.map((c, i) => {
    const n = i + 1
    const parts = [
      `- toma ${n} (#cam-${n}) · ${s(c.fromFrame, fps)}–${s(c.fromFrame + c.durationInFrames, fps)} s`,
      `${c.clipId} desde el segundo ${c.trimStartSec.toFixed(2)}`,
      `rol ${c.role}`,
      `energía ${c.energy}`,
      `entrada sugerida: ${c.transitionIn}${c.jump > 0 ? ' (salto por silencio dentro de la misma toma: cambia un poco el encuadre)' : ''}`,
      `subtítulos ${c.captionPlacement}`,
    ]
    if (c.punches.length) parts.push(`golpes de cámara en ${c.punches.map((p) => ((c.fromFrame + p) / fps).toFixed(2)).join(', ')} s`)
    for (const z of c.zooms) {
      parts.push(`acercamiento ${((c.fromFrame + z.fromFrame) / fps).toFixed(2)}–${((c.fromFrame + z.fromFrame + z.durationInFrames) / fps).toFixed(2)} s hacia ${box(z.focus)}, escala ${z.scale.toFixed(2)}`)
    }
    return parts.join(' · ')
  })
  const inserts = props.inserts.map(
    (ins, i) => `- teaser ${i + 1} (#cam-ins-${i + 1}) · ${s(ins.fromFrame, fps)}–${s(ins.fromFrame + ins.durationInFrames, fps)} s · ${ins.clipId} desde el segundo ${ins.trimStartSec.toFixed(2)} (sin sonido, encima de la voz)`
  )
  const captions = props.captions.map(
    (l, i) => `- cap-${i + 1} · ${s(l.fromFrame, fps)}–${s(l.toFrame, fps)} s · ${l.placement} · "${l.words.map((w) => (w.emphasis ? `*${w.text}*` : w.text)).join(' ')}"`
  )
  const last = props.cuts[props.cuts.length - 1]
  const tailStart = (last.fromFrame + last.durationInFrames) / fps
  return [
    `REEL: ${(props.durationInFrames / fps).toFixed(2)} s · 1080×1920 · ${fps} cps · diseño "${design}".`,
    '',
    'VEHÍCULO',
    formatVehicle(vehicle),
    '',
    'TOMAS (ya montadas en el HTML con su audio; tú mueves su cámara #cam-N y diseñas cómo se pasa de una a otra)',
    ...cuts,
    props.tailFrames > 0 ? `- cola · ${tailStart.toFixed(2)}–${(props.durationInFrames / fps).toFixed(2)} s · foto del último cuadro (#cam-tail)` : '',
    '',
    inserts.length ? 'TEASER (planos del auto encima de la voz del arranque, ya montados)' : 'TEASER: no hay.',
    ...inserts,
    '',
    'MOMENTOS DE GRÁFICOS (los decidió el montaje según lo que dice el asesor; tú decides cómo se ven y se mueven, y puedes',
    'sumar piezas de apoyo, pero cada uno de estos momentos tiene que verse):',
    ...props.graphics.map((g) => graphicLine(g, fps)),
    '',
    `SUBTÍTULOS (${props.captions.length} grupos ya escritos en #captions; *palabra* = clave, lleva la clase "em"):`,
    ...captions,
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}

export type Moment = { t: number; label: string }

/** Momentos para mirar: el medio de cada toma y del teaser, y el arranque de cada gráfico. */
export function keyMoments(props: ReelProps, max = 28): Moment[] {
  const fps = props.fps
  const out: Moment[] = []
  props.cuts.forEach((c, i) => out.push({ t: (c.fromFrame + c.durationInFrames / 2) / fps, label: `toma ${i + 1}` }))
  props.inserts.forEach((ins, i) => out.push({ t: (ins.fromFrame + ins.durationInFrames / 2) / fps, label: `teaser ${i + 1}` }))
  for (const g of props.graphics) out.push({ t: (g.fromFrame + Math.min(12, g.durationInFrames / 2)) / fps, label: `${g.id} ${g.type}` })
  out.sort((a, b) => a.t - b.t)
  const deduped: Moment[] = []
  for (const m of out) {
    const prev = deduped[deduped.length - 1]
    if (prev && m.t - prev.t < 0.5) prev.label += ` + ${m.label}`
    else deduped.push({ ...m })
  }
  if (deduped.length <= max) return deduped
  const step = deduped.length / max
  return Array.from({ length: max }, (_, k) => deduped[Math.floor(k * step)])
}

/** Qué hay en pantalla en el segundo t: el teaser si está activo, si no la toma (archivo y segundo dentro del clip). */
function sourceAt(props: ReelProps, t: number): { file: string; mediaSec: number } | null {
  const fps = props.fps
  const f = t * fps
  const ins = props.inserts.find((x) => f >= x.fromFrame && f < x.fromFrame + x.durationInFrames)
  const cut = ins ?? props.cuts.find((x) => f >= x.fromFrame && f < x.fromFrame + x.durationInFrames) ?? props.cuts[props.cuts.length - 1]
  if (!cut) return null
  const file = path.isAbsolute(cut.src) ? cut.src : path.join(ROOT, 'public', cut.src)
  const local = Math.min(f - cut.fromFrame, cut.durationInFrames - 1) / fps
  return { file, mediaSec: cut.trimStartSec + Math.max(0, local) }
}

/** Cuadros del video crudo (sin gráficos) en cada momento, a 540 px de ancho, en base64. */
export function momentFrames(props: ReelProps, moments: Moment[]): Array<Moment & { data: string }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-frames-'))
  try {
    return moments.flatMap((m, i) => {
      const src = sourceAt(props, m.t)
      if (!src) return []
      const out = path.join(dir, `f${i}.jpg`)
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', src.mediaSec.toFixed(3), '-i', src.file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', out])
      return fs.existsSync(out) ? [{ ...m, data: fs.readFileSync(out).toString('base64') }] : []
    })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
