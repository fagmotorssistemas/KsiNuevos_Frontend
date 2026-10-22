/**
 * Reel a partir de un plan ya hecho (sin transcribir ni pedirle a Claude un montaje nuevo): arma la línea de tiempo
 * y le pasa el montaje al director de motion graphics, que lo renderiza con HyperFrames. Útil para retocar un plan a
 * mano o reproducir uno guardado.
 *
 *   npx tsx pipeline/render-plan.ts --plan examples/trailblazer/plan.demo.json \
 *     --transcripts examples/trailblazer/transcripts.local.json --clips public/demo \
 *     --vehicle examples/trailblazer/vehiculo.json --name trailblazer [--design suv] [--quality draft] [--no-review] [--props-only --props-out p.json]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { creativePlanSchema } from '../src/plan/schema'
import { buildReelProps } from '../src/plan/timeline'
import type { ClipSource, Word } from '../src/plan/types'
import type { VehicleInfo } from './director-prompt'
import { runMotion } from './motion/engine'
import { motionDesignFor } from './motion/brief'
import { probeVideo, toPublicSrc } from './probe'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const { values } = parseArgs({
  options: {
    plan: { type: 'string' },
    transcripts: { type: 'string' },
    clips: { type: 'string', default: 'public/demo' },
    vehicle: { type: 'string' },
    name: { type: 'string', default: 'reel' },
    design: { type: 'string' },
    quality: { type: 'string', default: 'looks' },
    'no-review': { type: 'boolean', default: false },
    'props-out': { type: 'string' },
    'props-only': { type: 'boolean', default: false },
    whatsapp: { type: 'string' },
  },
})

if (!values.plan || !values.transcripts || (!values.vehicle && !values['props-only'])) {
  console.error('Faltan --plan, --transcripts y --vehicle (o --props-only)')
  process.exit(1)
}

const plan = creativePlanSchema.parse(JSON.parse(fs.readFileSync(values.plan, 'utf8')))
const transcripts = JSON.parse(fs.readFileSync(values.transcripts, 'utf8')) as Record<string, Word[]>
const vehicle = values.vehicle ? (JSON.parse(fs.readFileSync(values.vehicle, 'utf8')) as VehicleInfo) : null

// Los clips viven en /public (el proyecto HyperFrames los enlaza desde ahí).
const clipIds = [...new Set(plan.cuts.map((c) => c.clipId))]
const clips: ClipSource[] = clipIds.map((id) => {
  const file = path.resolve(values.clips!, `${id}.mp4`)
  return { id, src: toPublicSrc(file), ...probeVideo(file) }
})

// Camionetas: tiempos propios (cierre más largo, subtítulos más cortos).
const design = values.design ?? (vehicle ? motionDesignFor(vehicle) : 'general')
const { props, warnings } = buildReelProps(plan, clips, transcripts, {
  brand: { logoSrc: 'ksi-logo.png', accent: '#E81C2A', highlight: '#FFE94A', whatsapp: values.whatsapp },
  theme: design === 'camioneta' ? 'offroad' : 'ksi',
})
for (const w of warnings) console.warn(`[plan] ${w}`)
console.log(`[plan] ${props.cuts.length} cortes, ${props.graphics.length} gráficos, ${props.captions.length} líneas de subtítulos, ${(props.durationInFrames / props.fps).toFixed(1)}s`)

if (values['props-out']) {
  fs.mkdirSync(path.dirname(values['props-out']), { recursive: true })
  fs.writeFileSync(values['props-out'], JSON.stringify(props, null, 2))
  console.log(`[plan] props → ${values['props-out']}`)
}
if (values['props-only'] || !vehicle) process.exit(0)

const dir = path.join(ROOT, 'out/motion', values.name!)
const summary = await runMotion({
  props,
  vehicle,
  dir,
  out: path.join(dir, 'reel.mp4'),
  design: values.design,
  review: !values['no-review'],
  quality: values.quality,
})
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2))
