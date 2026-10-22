/**
 * Reel con motion graphics de Claude sobre HyperFrames.
 *
 * Toma el montaje que ya produce el pipeline (AssemblyAI + Claude director → props.json) y le pide a Claude, como
 * director de motion graphics, que escriba la composición HyperFrames del Reel: gráficos 2D y 3D, cámara,
 * transiciones y subtítulos según el diseño de la categoría. Después HyperFrames la revisa (check), Claude corrige,
 * mira capturas del resultado y lo pule, y se renderiza el MP4.
 *
 *   npx tsx pipeline/motion/run.ts --props out/<reel>/props.json --vehicle vehiculo.json --name trailblazer-suv
 *     [--design camioneta|suv|deportivo|premium|general] [--no-review] [--quality draft|looks|delivery]
 *
 * Salida: out/motion/<name>/ (proyecto HyperFrames editable, motion.json con los bloques de Claude y reel.mp4).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import type { ReelProps } from '../../src/plan/types'
import type { VehicleInfo } from '../director-prompt'
import { briefText, designDirections, keyMoments, momentFrames, motionDesignFor, offerDirections } from './brief'
import { assemble, MOTION_DESIGNS, prepareProject, skeletonHtml, type MotionDesign } from './compose'
import { MotionDirector, MOTION_MODEL, type MotionResult } from './director'
import { hfCheck, hfRender, hfSnapshot } from './hf'
import { motionSystem } from './prompt'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const { values } = parseArgs({
  options: {
    props: { type: 'string' },
    vehicle: { type: 'string' },
    name: { type: 'string', default: 'reel' },
    design: { type: 'string' },
    review: { type: 'boolean', default: true },
    'no-review': { type: 'boolean', default: false },
    'fix-rounds': { type: 'string', default: '2' },
    quality: { type: 'string', default: 'looks' },
    'no-render': { type: 'boolean', default: false },
    /** Retoma desde motion.json (lo que Claude ya escribió) en vez de pedir una composición nueva. */
    resume: { type: 'boolean', default: false },
  },
})
if (!values.props || !values.vehicle) {
  console.error('Uso: tsx pipeline/motion/run.ts --props props.json --vehicle vehiculo.json --name <nombre> [--design suv]')
  process.exit(1)
}

const props = JSON.parse(fs.readFileSync(values.props, 'utf8')) as ReelProps
const vehicle = JSON.parse(fs.readFileSync(values.vehicle, 'utf8')) as VehicleInfo
const design = (values.design && (MOTION_DESIGNS as readonly string[]).includes(values.design) ? values.design : motionDesignFor(vehicle)) as MotionDesign
const dir = path.join(ROOT, 'out/motion', values.name!)
fs.mkdirSync(dir, { recursive: true })
console.log(`[motion] ${vehicle.marca} ${vehicle.modelo} · diseño ${design} · ${(props.durationInFrames / props.fps).toFixed(1)} s → ${dir}`)

// 1) Proyecto HyperFrames: kit, clips y la base del index.html.
const media = prepareProject(dir, props)
const skeleton = skeletonHtml(props, media, design)
// Fuera del proyecto: un segundo .html con data-composition-id en la carpeta confunde a HyperFrames.
fs.writeFileSync(`${dir}.skeleton.html`, skeleton)
fs.rmSync(path.join(dir, 'skeleton.html'), { force: true })

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
    for (const w of warnings.slice(0, 8)) console.log(`[check]   aviso: ${w}`)
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

// 2) Guion y cuadros para Claude.
// Variedad: las direcciones usadas hace poco (este auto primero, luego la categoría) no se ofrecen.
const known = new Set(designDirections(design).map((d) => d.id))
const recent = [...new Set([...(vehicle.reelsAnteriores ?? []).flatMap((r) => r.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? []), ...(vehicle.direccionesRecientes ?? [])])].filter((id) => known.has(id))
const offered = offerDirections(design, recent)
console.log(`[motion] direcciones ofrecidas: ${offered.map((d) => d.id).join(', ')}${recent.length ? ` (recientes: ${recent.join(', ')})` : ''}`)
const brief = briefText(props, vehicle, design, offered, recent)
fs.writeFileSync(path.join(dir, 'brief.txt'), brief)
const moments = keyMoments(props)
const frames = momentFrames(props, moments)
console.log(`[motion] guion listo · ${frames.length} cuadros`)

// 3) Claude escribe la composición; HyperFrames la revisa y Claude corrige.
const director = new MotionDirector(motionSystem(design))
const previous = path.join(dir, 'motion.json')
let result: MotionResult
if (values.resume && fs.existsSync(previous)) {
  result = JSON.parse(fs.readFileSync(previous, 'utf8')) as MotionResult
  director.resume(brief, frames, result)
  save(result, 'resume')
  console.log('[motion] retomando la composición que Claude ya escribió')
} else {
  result = await director.write(brief, frames)
  save(result, 'v1')
}
if (result.notes) console.log(`[motion] idea: ${result.notes.replace(/\s+/g, ' ').slice(0, 400)}`)
const chosen = result.notes.match(/direcci[oó]n:\s*([a-z0-9-]+)/i)?.[1]
if (chosen) fs.writeFileSync(path.join(dir, 'direccion.txt'), chosen)
result = await checkAndFix(director, result, Number(values['fix-rounds']), 'v1')

// 4) Revisión visual: capturas del render en los momentos clave → Claude pule.
if (values.review && !values['no-review']) {
  const shots = hfSnapshot(dir, moments.map((m) => m.t), path.join(dir, 'review-1'))
  console.log(`[motion] ${shots.length} capturas para revisar`)
  const revised = await director.review(shots)
  if (revised) {
    save(revised, 'v2')
    result = await checkAndFix(director, revised, Number(values['fix-rounds']), 'v2')
    hfSnapshot(dir, moments.map((m) => m.t), path.join(dir, 'review-2'))
  } else {
    console.log('[motion] Claude aprobó las capturas sin cambios')
  }
}

// 5) Costo aproximado (Opus 5.5: $4 entrada, $20 salida, $0,20 lectura de caché por millón).
const tokens = director.log.reduce((a, s) => ({ input: a.input + s.input - s.cached, cached: a.cached + s.cached, output: a.output + s.output }), { input: 0, cached: 0, output: 0 })
if (MOTION_MODEL === 'claude-opus-5-5') {
  const usd = (tokens.input * 4 + tokens.cached * 0.2 + tokens.output * 20) / 1e6
  console.log(`[motion] tokens: entrada ${tokens.input}, caché ${tokens.cached}, salida ${tokens.output} · ~US$ ${usd.toFixed(2)}`)
}

// 6) Render.
if (!values['no-render']) {
  const out = path.join(dir, 'reel.mp4')
  console.log(`[render] HyperFrames (${values.quality})…`)
  hfRender(dir, out, values.quality)
  console.log(`[render] listo → ${out}`)
}
