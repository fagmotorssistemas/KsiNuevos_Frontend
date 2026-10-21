/**
 * Renderiza un Reel a partir de un plan ya hecho (sin llamar a Gemini ni a AssemblyAI).
 * Útil para retocar un plan a mano o reproducir uno guardado.
 *
 *   npx tsx pipeline/render-plan.ts --plan examples/trailblazer/plan.demo.json \
 *     --transcripts examples/trailblazer/transcripts.local.json --clips public/demo \
 *     --out out/trailblazer.mp4 [--stills 30,90,150] [--props-only] [--watermark "MUESTRA"]
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { creativePlanSchema } from '../src/plan/schema'
import { buildReelProps } from '../src/plan/timeline'
import type { ClipSource, Word } from '../src/plan/types'
import { probeVideo } from './probe'
import { renderReel, renderStills } from './render'

const { values } = parseArgs({
  options: {
    plan: { type: 'string' },
    transcripts: { type: 'string' },
    clips: { type: 'string', default: 'public/demo' },
    out: { type: 'string', default: 'out/reel.mp4' },
    'props-out': { type: 'string' },
    'props-only': { type: 'boolean', default: false },
    stills: { type: 'string' },
    scale: { type: 'string', default: '1' },
    watermark: { type: 'string' },
    whatsapp: { type: 'string' },
  },
})

if (!values.plan || !values.transcripts) {
  console.error('Faltan --plan y --transcripts')
  process.exit(1)
}

const plan = creativePlanSchema.parse(JSON.parse(fs.readFileSync(values.plan, 'utf8')))
const transcripts = JSON.parse(fs.readFileSync(values.transcripts, 'utf8')) as Record<string, Word[]>

// Los clips viven en /public para que Remotion los sirva (staticFile).
const publicDir = path.resolve('public')
const clipIds = [...new Set(plan.cuts.map((c) => c.clipId))]
const clips: ClipSource[] = clipIds.map((id) => {
  const file = path.resolve(values.clips!, `${id}.mp4`)
  if (!file.startsWith(publicDir)) throw new Error(`El clip debe estar dentro de public/: ${file}`)
  return { id, src: path.relative(publicDir, file), ...probeVideo(file) }
})

const { props, warnings } = buildReelProps(plan, clips, transcripts, {
  brand: { logoSrc: 'ksi-logo.png', accent: '#E81C2A', highlight: '#FFE94A', whatsapp: values.whatsapp },
  watermark: values.watermark,
})
for (const w of warnings) console.warn(`[plan] ${w}`)
console.log(`[plan] ${props.cuts.length} cortes, ${props.graphics.length} gráficos, ${props.captions.length} líneas de subtítulos, ${(props.durationInFrames / props.fps).toFixed(1)}s`)

if (values['props-out']) {
  fs.mkdirSync(path.dirname(values['props-out']), { recursive: true })
  fs.writeFileSync(values['props-out'], JSON.stringify(props, null, 2))
  console.log(`[plan] props → ${values['props-out']}`)
}
if (values['props-only']) process.exit(0)

if (values.stills) {
  const frames = values.stills.split(',').map(Number)
  const files = await renderStills(props, frames, path.dirname(values.out!), Number(values.scale))
  console.log(files.join('\n'))
} else {
  fs.mkdirSync(path.dirname(values.out!), { recursive: true })
  await renderReel(props, values.out!, { scale: Number(values.scale) })
  console.log(`[render] listo → ${values.out}`)
}
