/**
 * Motor del Reel: Claude, como director de motion graphics, escribe la composición HyperFrames sobre el montaje
 * (cortes, subtítulos y momentos de gráficos); HyperFrames la revisa (check), Claude corrige, mira capturas del
 * resultado y lo pule, y HyperFrames renderiza el MP4.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { ReelProps } from '../../src/plan/types'
import type { VehicleInfo } from '../director-prompt'
import { archetypeFor, type Archetype } from '../reel-skill'
import { briefText, designDirections, keyMoments, momentFrames, motionDesignFor, offerDirections } from './brief'
import { assemble, fetchMusic, MOTION_DESIGNS, prepareProject, skeletonHtml, type MotionDesign } from './compose'
import { MotionDirector, MOTION_MODEL, type MotionResult } from './director'
import { hfCheck, hfEnsureBrowser, hfRender, hfSnapshot } from './hf'
import { motionSystem } from './prompt'

export type MotionOptions = {
  props: ReelProps
  vehicle: VehicleInfo
  /** Carpeta del proyecto HyperFrames (queda editable después). */
  dir: string
  /** MP4 final. */
  out: string
  /** Fuerza un diseño (si no, sale del vehículo). */
  design?: string
  /** Revisión visual de Claude sobre capturas (por defecto sí). */
  review?: boolean
  fixRounds?: number
  /** draft | looks | delivery */
  quality?: string
  /** Retoma desde motion.json en vez de escribir la composición de nuevo. */
  resume?: boolean
  render?: boolean
}

export type MotionSummary = {
  design: MotionDesign
  /** Arquetipo de la skill del equipo (SUV, camioneta, sedán o deportivo). */
  arquetipo: Archetype
  /** Dirección creativa que eligió Claude (para no repetirla en el próximo Reel). */
  direccion: string | null
  notas: string
  usd: number | null
}

export async function runMotion(o: MotionOptions): Promise<MotionSummary> {
  const { props, vehicle, dir } = o
  const design = (o.design && (MOTION_DESIGNS as readonly string[]).includes(o.design) ? o.design : motionDesignFor(vehicle)) as MotionDesign
  const archetype = archetypeFor(vehicle.categoria)
  fs.mkdirSync(dir, { recursive: true })
  console.log(`[motion] ${vehicle.marca} ${vehicle.modelo} · diseño ${design} · arquetipo ${archetype} · ${(props.durationInFrames / props.fps).toFixed(1)} s`)
  hfEnsureBrowser(dir)

  // 1) Proyecto HyperFrames: kit, clips y la base del index.html.
  const media = prepareProject(dir, props, await fetchMusic(dir, props.music?.src))
  const skeleton = skeletonHtml(props, media, design, archetype)
  // Fuera del proyecto: un segundo .html con data-composition-id en la carpeta confunde a HyperFrames.
  fs.writeFileSync(`${dir}.skeleton.html`, skeleton)
  const save = (r: MotionResult, label: string) => {
    fs.writeFileSync(path.join(dir, 'index.html'), assemble(skeleton, r))
    fs.writeFileSync(path.join(dir, `motion.${label}.json`), JSON.stringify(r, null, 2))
    fs.writeFileSync(path.join(dir, 'motion.json'), JSON.stringify(r, null, 2))
  }

  /** Revisa con HyperFrames y, si hay errores, pide a Claude que los corrija (hasta `rounds` vueltas). */
  async function checkAndFix(director: MotionDirector, current: MotionResult, rounds: number, tag: string): Promise<MotionResult> {
    let result = current
    for (let round = 1; ; round++) {
      const { errors, warnings } = hfCheck(dir)
      console.log(`[check] ${errors.length} errores, ${warnings.length} advertencias`)
      if (!errors.length) return result
      for (const e of errors.slice(0, 12)) console.log(`[check]   error: ${e}`)
      if (round > rounds) throw new Error(`La composición sigue con ${errors.length} errores después de ${rounds} correcciones`)
      // Con los errores van también los avisos (uno por tipo): algunos se notan en el video aunque no bloqueen.
      const seen = new Set<string>()
      const notes = warnings.filter((w) => {
        const code = w.match(/^\[([^\]]+)\]/)?.[1] ?? w
        if (seen.has(code)) return false
        seen.add(code)
        return true
      })
      result = await director.fix(`${errors.slice(0, 40).join('\n')}${notes.length ? `\n\nAvisos (corrígelos si afectan lo que se ve):\n${notes.slice(0, 12).join('\n')}` : ''}`)
      save(result, `${tag}-fix${round}`)
    }
  }

  // 2) Guion y cuadros. Variedad: no se ofrecen las direcciones usadas hace poco (este auto primero, luego en general).
  const known = new Set(designDirections(design).map((d) => d.id))
  const recent = [
    ...new Set([...(vehicle.reelsAnteriores ?? []).flatMap((r) => r.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? []), ...(vehicle.direccionesRecientes ?? [])]),
  ].filter((id) => known.has(id))
  const offered = offerDirections(design, recent)
  console.log(`[motion] direcciones ofrecidas: ${offered.map((d) => d.id).join(', ')}${recent.length ? ` (recientes: ${recent.join(', ')})` : ''}`)
  const brief = briefText(props, vehicle, design, archetype, offered, recent)
  fs.writeFileSync(path.join(dir, 'brief.txt'), brief)
  const moments = keyMoments(props)
  const frames = momentFrames(props, moments)
  console.log(`[motion] guion listo · ${frames.length} cuadros`)

  // 3) Claude escribe la composición; HyperFrames la revisa y Claude corrige.
  const director = new MotionDirector(motionSystem(design))
  const previous = path.join(dir, 'motion.json')
  let result: MotionResult
  if (o.resume && fs.existsSync(previous)) {
    result = JSON.parse(fs.readFileSync(previous, 'utf8')) as MotionResult
    director.resume(brief, frames, result)
    console.log('[motion] retomando la composición que Claude ya escribió')
  } else {
    result = await director.write(brief, frames)
  }
  save(result, 'v1')
  if (result.notes) console.log(`[motion] idea: ${result.notes.replace(/\s+/g, ' ').slice(0, 400)}`)
  const fixRounds = o.fixRounds ?? 2
  result = await checkAndFix(director, result, fixRounds, 'v1')

  // 4) Revisión visual: capturas en los momentos clave → Claude pule.
  if (o.review !== false) {
    const shots = hfSnapshot(dir, moments.map((m) => m.t), path.join(dir, 'review-1'))
    console.log(`[motion] ${shots.length} capturas para revisar`)
    const revised = await director.review(shots)
    if (revised) {
      save(revised, 'v2')
      result = await checkAndFix(director, revised, fixRounds, 'v2')
    } else {
      console.log('[motion] Claude aprobó las capturas sin cambios')
    }
  }

  // 5) Costo aproximado (Opus 5.5: $4 entrada, $20 salida, $0,20 lectura de caché por millón).
  const t = director.log.reduce((a, s) => ({ input: a.input + s.input - s.cached, cached: a.cached + s.cached, output: a.output + s.output }), { input: 0, cached: 0, output: 0 })
  const usd = MOTION_MODEL === 'claude-opus-5-5' ? (t.input * 4 + t.cached * 0.2 + t.output * 20) / 1e6 : null
  console.log(`[motion] tokens: entrada ${t.input}, caché ${t.cached}, salida ${t.output}${usd !== null ? ` · ~US$ ${usd.toFixed(2)}` : ''}`)

  // 6) Render.
  if (o.render !== false) {
    console.log(`[render] HyperFrames (${o.quality ?? 'looks'})…`)
    hfRender(dir, o.out, o.quality ?? 'looks')
    console.log(`[render] listo → ${o.out}`)
  }
  const direccion = result.notes.match(/direcci[oó]n:\s*([a-z0-9-]+)/i)?.[1] ?? null
  return { design, arquetipo: archetype, direccion, notas: result.notes, usd }
}
