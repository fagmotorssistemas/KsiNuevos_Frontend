/**
 * Director IA (beta, solo local): en vez del pipeline Shotstack, corre `reels-studio`
 * (AssemblyAI → Gemini como director de marketing → gráficos 3D con Remotion) para un job
 * de `video_jobs_v2` y sube el MP4 al mismo bucket que el resto de reels.
 *
 * Necesita Chromium + ffmpeg y varios minutos por video, así que no corre en Vercel: solo con
 * la web en una computadora (`npm run dev`) con `reels-studio` instalado.
 */

import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline as streamPipeline } from 'node:stream/promises'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { VideoJobStatus } from '@/lib/videos/types'
import { isPipelineInputMeta, normalizeMusicTrimStartSec } from '@/lib/videos/clip-config'
import { getSignedUrlForPath, storeFinalReelBuffer } from '@/lib/videos/storage'

const STUDIO_DIR = path.join(process.cwd(), 'reels-studio')
const TSX_CLI = path.join(STUDIO_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs')
/** Volumen de la música bajo la voz del asesor. */
const MUSIC_VOLUME = 0.12

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Motivo por el que el Director IA no puede correr aquí, o null si está listo. */
export function directorIaUnavailableReason(): string | null {
  if (process.env.VERCEL) {
    return 'Director IA solo funciona con la web corriendo en una computadora (npm run dev). En producción todavía no hay servidor de render.'
  }
  if (!fs.existsSync(TSX_CLI)) {
    return 'Falta instalar reels-studio: abre una terminal en la carpeta reels-studio y corre "npm install".'
  }
  if (!process.env.GEMINI_API_KEY || !process.env.ASSEMBLYAI_API_KEY) {
    return 'Faltan GEMINI_API_KEY o ASSEMBLYAI_API_KEY en .env.local.'
  }
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
  } catch {
    return 'No se encontró ffmpeg en esta computadora (Mac: brew install ffmpeg · Windows: winget install Gyan.FFmpeg).'
  }
  return null
}

async function updateJob(
  jobId: string,
  fields: Partial<Database['public']['Tables']['video_jobs_v2']['Update']>
) {
  const { error } = await getServiceClient().from('video_jobs_v2').update(fields).eq('id', jobId)
  if (error) console.error(`[DirectorIA][${jobId}] Error actualizando job: ${error.message}`)
}

type JobRow = Pick<
  Database['public']['Tables']['video_jobs_v2']['Row'],
  'raw_video_paths' | 'music_track_url' | 'selected_clips' | 'inventory_vehicle_id' | 'job_name' | 'whatsapp_number'
>

/** Datos del carro para Gemini y AssemblyAI: inventario si hay, si no lo que se escribió en el modal. */
async function vehicleInfoForJob(job: JobRow): Promise<Record<string, unknown>> {
  const meta = isPipelineInputMeta(job.selected_clips) ? job.selected_clips : undefined
  const vehicleId = job.inventory_vehicle_id ?? meta?.vehicleId ?? null
  if (vehicleId) {
    const { data } = await getServiceClient()
      .from('inventoryoracle')
      .select('brand, model, year, version, color, engine_displacement, fuel_type, transmission, mileage, type_body')
      .eq('id', vehicleId)
      .maybeSingle()
    if (data?.brand && data.model) {
      return {
        marca: data.brand,
        modelo: data.model,
        anio: data.year ?? undefined,
        version: data.version ?? undefined,
        motor: data.engine_displacement ?? undefined,
        combustible: data.fuel_type ?? undefined,
        transmision: data.transmission ?? undefined,
        kilometraje: data.mileage ?? undefined,
        color: data.color ?? undefined,
        notas: data.type_body ? `Carrocería: ${data.type_body}` : undefined,
      }
    }
  }
  const canon = meta?.canonicalVehicle
  const words = (job.job_name ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    marca: canon?.brand?.trim() || words[0] || 'Vehículo',
    modelo: canon?.model?.trim() || words.slice(1).join(' ') || words[0] || 'seminuevo',
    anio: canon?.year?.trim() || undefined,
    notas: job.job_name ? `Nombre del trabajo: ${job.job_name}` : undefined,
  }
}

async function downloadClips(jobId: string, paths: string[], dir: string) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [i, storagePath] of paths.entries()) {
    const ext = path.extname(storagePath) || '.mp4'
    const target = path.join(dir, `${String(i + 1).padStart(2, '0')}${ext}`)
    const res = await fetch(await getSignedUrlForPath(storagePath))
    if (!res.ok || !res.body) throw new Error(`No se pudo descargar el clip ${i + 1} (HTTP ${res.status})`)
    await streamPipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), fs.createWriteStream(target))
    console.log(`[DirectorIA][${jobId}] Clip ${i + 1}/${paths.length} descargado`)
  }
}

type Progress = { status: VideoJobStatus; step: string; pct: number }

/** Traduce lo que imprime reels-studio a pasos y porcentaje de la lista de videos. */
function progressFromLine(line: string, clipCount: number): Progress | null {
  if (line.startsWith('[clips]')) return { status: 'transcribing', step: 'Director IA: preparando clips', pct: 28 }
  const asr = line.match(/^\[assemblyai\] transcribiendo clip(\d+)/)
  if (asr) {
    const n = Number(asr[1])
    return {
      status: 'transcribing',
      step: `AssemblyAI: escuchando clip ${n} de ${clipCount}`,
      pct: 30 + Math.round((15 * (n - 1)) / Math.max(1, clipCount)),
    }
  }
  if (line.startsWith('[gemini] subiendo')) return { status: 'analyzing', step: 'Gemini: viendo los clips', pct: 48 }
  if (line.includes('pensando el Reel')) return { status: 'analyzing', step: 'Gemini: diseñando el Reel', pct: 55 }
  if (line.startsWith('[gemini] estrategia')) return { status: 'analyzing', step: 'Gemini: plan creativo listo', pct: 62 }
  if (line.startsWith('[plan]')) return { status: 'rendering', step: 'Armando la línea de tiempo', pct: 65 }
  const render = line.match(/^\[render\] (\d+)%/)
  if (render) {
    const n = Number(render[1])
    return { status: 'rendering', step: `Render 3D: ${n}%`, pct: 66 + Math.round(n * 0.3) }
  }
  return null
}

/** Corre `pipeline/run.ts` de reels-studio y va reportando el progreso al job. */
function runStudio(jobId: string, args: string[], clipCount: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TSX_CLI, 'pipeline/run.ts', ...args], {
      cwd: STUDIO_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const tail: string[] = []
    const remember = (line: string) => {
      tail.push(line)
      if (tail.length > 30) tail.shift()
    }
    let last: Progress | null = null
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      console.log(`[DirectorIA][${jobId}] ${line}`)
      remember(line)
      const p = progressFromLine(line, clipCount)
      if (p && (!last || p.status !== last.status || p.step !== last.step) && (!last || p.pct >= last.pct)) {
        last = p
        void updateJob(jobId, { status: p.status, current_step: p.step, progress_percentage: p.pct })
      }
    })
    readline.createInterface({ input: child.stderr }).on('line', (line) => {
      // Remotion avisa por stderr cosas que no son errores (memoria, three.js); solo se guardan para el mensaje final.
      remember(line)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve()
      const detail = tail.filter((l) => /error|falta|no se|failed|invalid/i.test(l)).slice(-4).join(' | ')
      reject(new Error(detail || tail.slice(-4).join(' | ') || `reels-studio terminó con código ${code}`))
    })
  })
}

/** Ejecuta el Director IA completo para un job ya subido a Storage. */
export async function runDirectorIaForJob(jobId: string): Promise<void> {
  const supabase = getServiceClient()
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `director-ia-${jobId}-`))
  try {
    const unavailable = directorIaUnavailableReason()
    if (unavailable) throw new Error(unavailable)

    const { data: job, error } = await supabase
      .from('video_jobs_v2')
      .select('raw_video_paths, music_track_url, selected_clips, inventory_vehicle_id, job_name, whatsapp_number')
      .eq('id', jobId)
      .single()
    if (error || !job) throw new Error('Job no encontrado')
    const paths = job.raw_video_paths ?? []
    if (paths.length === 0) throw new Error('El job no tiene clips en Storage')

    await updateJob(jobId, { status: 'transcribing', current_step: 'Director IA: descargando clips', progress_percentage: 22 })
    const clipsDir = path.join(work, 'clips')
    await downloadClips(jobId, paths, clipsDir)

    const vehicleFile = path.join(work, 'vehiculo.json')
    fs.writeFileSync(vehicleFile, JSON.stringify(await vehicleInfoForJob(job), null, 2))

    const meta = isPipelineInputMeta(job.selected_clips) ? job.selected_clips : undefined
    const args = ['--name', jobId, '--vehicle', vehicleFile, '--clips', clipsDir, '--cleanup']
    if (job.music_track_url) {
      const musicStart = normalizeMusicTrimStartSec(meta?.musicTrimStartSec ?? undefined) ?? 0
      args.push('--music', job.music_track_url, '--music-volume', String(MUSIC_VOLUME), '--music-start', String(musicStart))
    }
    if (job.whatsapp_number?.trim()) args.push('--whatsapp', job.whatsapp_number.trim())

    await runStudio(jobId, args, paths.length)

    const outDir = path.join(STUDIO_DIR, 'out', jobId)
    await updateJob(jobId, { current_step: 'Subiendo el video', progress_percentage: 97 })
    const finalUrl = await storeFinalReelBuffer(jobId, fs.readFileSync(path.join(outDir, 'reel.mp4')))
    const props = JSON.parse(fs.readFileSync(path.join(outDir, 'props.json'), 'utf8')) as {
      durationInFrames: number
      fps: number
    }
    const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'plan.json'), 'utf8')) as {
      strategy?: string
      caption?: string
    }

    const { data: prev } = await supabase.from('video_jobs_v2').select('social_publish_stage').eq('id', jobId).single()
    await updateJob(jobId, {
      status: 'completed',
      progress_percentage: 100,
      current_step: 'Video listo (Director IA)',
      error_message: null,
      final_video_url: finalUrl,
      final_video_duration: Number((props.durationInFrames / props.fps).toFixed(2)),
      // Sin `sequence`: la interfaz no ofrece el editor de Shotstack para estos reels.
      gemini_analysis: { director_ia: true, overall_strategy: plan.strategy ?? null, caption: plan.caption ?? null, plan },
      social_publish_stage: prev?.social_publish_stage ?? 'generado',
    })
    console.log(`[DirectorIA][${jobId}] Listo → ${finalUrl}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[DirectorIA][${jobId}] Error:`, message)
    await updateJob(jobId, {
      status: 'failed',
      error_message: `Director IA: ${message}`.slice(0, 500),
      current_step: 'Error en Director IA',
    })
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}
