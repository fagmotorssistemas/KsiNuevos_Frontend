/**
 * Motion graphics de Claude sobre un montaje ya hecho (props.json de pipeline/run.ts o de render-plan.ts).
 * Sirve para repetir o probar solo el diseño sin volver a transcribir ni a montar.
 *
 *   npx tsx pipeline/motion/run.ts --props out/<reel>/props.json --vehicle out/<reel>/vehicle.json --name prueba
 *     [--design camioneta|suv|deportivo|premium|superpremium|general] [--no-review] [--quality draft|looks|delivery]
 *     [--resume] [--no-render]
 *
 * Salida: out/motion/<name>/ (proyecto HyperFrames editable, motion.json con los bloques de Claude y reel.mp4).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import type { ReelProps } from '../../src/plan/types'
import type { VehicleInfo } from '../director-prompt'
import { runMotion } from './engine'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const { values } = parseArgs({
  options: {
    props: { type: 'string' },
    vehicle: { type: 'string' },
    name: { type: 'string', default: 'reel' },
    design: { type: 'string' },
    'no-review': { type: 'boolean', default: false },
    'fix-rounds': { type: 'string', default: '2' },
    quality: { type: 'string', default: 'looks' },
    'no-render': { type: 'boolean', default: false },
    resume: { type: 'boolean', default: false },
  },
})
if (!values.props || !values.vehicle) {
  console.error('Uso: tsx pipeline/motion/run.ts --props props.json --vehicle vehiculo.json --name <nombre> [--design suv]')
  process.exit(1)
}

const dir = path.join(ROOT, 'out/motion', values.name!)
const summary = await runMotion({
  props: JSON.parse(fs.readFileSync(values.props, 'utf8')) as ReelProps,
  vehicle: JSON.parse(fs.readFileSync(values.vehicle, 'utf8')) as VehicleInfo,
  dir,
  out: path.join(dir, 'reel.mp4'),
  design: values.design,
  review: !values['no-review'],
  fixRounds: Number(values['fix-rounds']),
  quality: values.quality,
  resume: values.resume,
  render: !values['no-render'],
})
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2))
