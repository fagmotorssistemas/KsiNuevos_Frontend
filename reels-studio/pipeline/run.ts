/**
 * Reel completo: clips crudos → AssemblyAI → Gemini (director) → Remotion.
 *
 *   npx tsx pipeline/run.ts --name trailblazer-2019 --vehicle vehiculo.json --clips ./clips
 *
 * Deja todo en out/<name>/ (transcripts.json, plan.json, props.json, reel.mp4). Si plan.json ya
 * existe se reutiliza: el equipo puede retocarlo a mano y volver a renderizar (usa --replan
 * para pedirle a Gemini uno nuevo).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { creativePlanSchema, type CreativePlan } from '../src/plan/schema'
import { buildReelProps } from '../src/plan/timeline'
import type { ClipSource } from '../src/plan/types'
import { transcribeClip, type TranscribedWord } from './assemblyai'
import type { VehicleInfo } from './director-prompt'
import { directReel, refineFocusBoxes, type DirectorClip } from './gemini-director'
import { probeVideo } from './probe'
import { renderReel, renderStills, toPublicSrc } from './render'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Claves en reels-studio/.env (ver .env.example), si existe.
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

for (const tool of ['ffmpeg', 'ffprobe']) {
  try {
    execFileSync(tool, ['-version'], { stdio: 'ignore' })
  } catch {
    console.error(`No se encontró ${tool}. Instálalo (Windows: winget install Gyan.FFmpeg · Mac: brew install ffmpeg) y abre una terminal nueva.`)
    process.exit(1)
  }
}

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    vehicle: { type: 'string' },
    clips: { type: 'string', multiple: true },
    model: { type: 'string' },
    replan: { type: 'boolean', default: false },
    retranscribe: { type: 'boolean', default: false },
    stills: { type: 'string' },
    scale: { type: 'string', default: '1' },
    music: { type: 'string' },
    'music-volume': { type: 'string', default: '0.12' },
    'music-start': { type: 'string', default: '0' },
    /** Borra las copias normalizadas de los clips (public/jobs/<name>) al terminar. */
    cleanup: { type: 'boolean', default: false },
    whatsapp: { type: 'string' },
  },
})

if (!values.name || !values.vehicle || !values.clips?.length) {
  console.error('Uso: npx tsx pipeline/run.ts --name <nombre> --vehicle <vehiculo.json> --clips <carpeta|archivos...>')
  process.exit(1)
}

const name = values.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
const vehicle = JSON.parse(fs.readFileSync(values.vehicle, 'utf8')) as VehicleInfo
const outDir = path.join(ROOT, 'out', name)
const publicJobDir = path.join(ROOT, 'public', 'jobs', name)
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicJobDir, { recursive: true })

// 1) Clips en orden de nombre, normalizados a MP4 H.264 vertical (también endereza videos rotados del celular).
const inputs = values.clips
  .flatMap((p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((f) => path.join(p, f)) : [p]))
  .filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
if (inputs.length === 0) throw new Error('No se encontraron clips (.mp4/.mov/.m4v/.webm)')

const clips: Array<DirectorClip & ClipSource> = inputs.map((input, i) => {
  const id = `clip${i + 1}`
  const file = path.join(publicJobDir, `${id}.mp4`)
  if (!fs.existsSync(file)) {
    console.log(`[clips] ${path.basename(input)} → ${id}.mp4`)
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', input,
      '-vf', "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', file,
    ])
  }
  const meta = probeVideo(file)
  return { id, file, src: toPublicSrc(file), words: [], ...meta }
})

// 2) Transcripción (se guarda para no volver a pagarla).
const transcriptsFile = path.join(outDir, 'transcripts.json')
let transcripts: Record<string, TranscribedWord[]> = {}
if (fs.existsSync(transcriptsFile) && !values.retranscribe) {
  transcripts = JSON.parse(fs.readFileSync(transcriptsFile, 'utf8'))
} else {
  const keyterms = [
    vehicle.marca,
    vehicle.modelo,
    `${vehicle.marca} ${vehicle.modelo}`,
    vehicle.version,
    vehicle.motor,
    vehicle.palabraClave,
    ...(vehicle.equipamiento ?? []),
  ].filter((t): t is string => Boolean(t))
  for (const c of clips) {
    console.log(`[assemblyai] transcribiendo ${c.id}…`)
    transcripts[c.id] = await transcribeClip(c.file, keyterms)
    console.log(`[assemblyai] ${c.id}: ${transcripts[c.id].map((w) => w.text).join(' ') || '(sin voz)'}`)
  }
  fs.writeFileSync(transcriptsFile, JSON.stringify(transcripts, null, 2))
}
for (const c of clips) c.words = transcripts[c.id] ?? []

// 3) Plan creativo de Gemini (+ ubicación precisa de lo que se señala).
const planFile = path.join(outDir, 'plan.json')
let plan: CreativePlan
if (fs.existsSync(planFile) && !values.replan) {
  plan = creativePlanSchema.parse(JSON.parse(fs.readFileSync(planFile, 'utf8')))
  console.log('[gemini] usando plan.json existente (usa --replan para uno nuevo)')
} else {
  const { plan: draft, raw } = await directReel({ clips, vehicle, model: values.model })
  fs.writeFileSync(path.join(outDir, 'plan.gemini-raw.json'), JSON.stringify(raw, null, 2))
  plan = await refineFocusBoxes({ plan: draft, clips, model: values.model })
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2))
  console.log(`[gemini] estrategia: ${plan.strategy}`)
}

// 4) Línea de tiempo y render.
const music = values.music
  ? { src: values.music, volume: Number(values['music-volume']), startSec: Math.max(0, Number(values['music-start']) || 0) }
  : undefined
const { props, warnings } = buildReelProps(plan, clips, transcripts, {
  brand: { logoSrc: 'ksi-logo.png', accent: '#E81C2A', highlight: '#FFE94A', whatsapp: values.whatsapp },
  music,
})
for (const w of warnings) console.warn(`[plan] ${w}`)
fs.writeFileSync(path.join(outDir, 'props.json'), JSON.stringify(props, null, 2))
console.log(`[plan] ${props.cuts.length} cortes, ${props.graphics.length} gráficos, ${(props.durationInFrames / props.fps).toFixed(1)} s`)

if (values.stills) {
  const files = await renderStills(props, values.stills.split(',').map(Number), outDir, Number(values.scale))
  console.log(files.join('\n'))
} else {
  const out = path.join(outDir, 'reel.mp4')
  await renderReel(props, out, { scale: Number(values.scale) })
  console.log(`[render] listo → ${out}`)
  if (values.cleanup) fs.rmSync(publicJobDir, { recursive: true, force: true })
}
