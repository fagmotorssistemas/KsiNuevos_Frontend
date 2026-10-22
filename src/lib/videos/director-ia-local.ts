/**
 * Director IA (beta, solo local): en vez del pipeline Shotstack, corre `reels-studio`
 * (AssemblyAI → Claude como director de marketing → gráficos 3D con Remotion) para un job
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
/** Si reels-studio no termina en este tiempo, se corta (un render colgado no debe dejar el job "rendering" para siempre). */
const STUDIO_TIMEOUT_MS = 40 * 60 * 1000

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
  if (!fs.existsSync(TSX_CLI) || !fs.existsSync(path.join(STUDIO_DIR, 'node_modules', '@anthropic-ai', 'sdk'))) {
    return 'Falta instalar o actualizar reels-studio: abre una terminal en la carpeta reels-studio y corre "npm install".'
  }
  if (!process.env.ASSEMBLYAI_API_KEY) return 'Falta ASSEMBLYAI_API_KEY en .env o .env.local (si la acabas de agregar, reinicia npm run dev).'
  if (!process.env.ANTHROPIC_API_KEY) {
    return 'Falta ANTHROPIC_API_KEY en .env o .env.local (Claude dirige los reels). Si la acabas de agregar, reinicia npm run dev.'
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

/** Datos del carro para Claude y AssemblyAI: inventario si hay, si no lo que se escribió en el modal. */
/** La carrocería del inventario viene escrita de muchas formas ("jeep" es como se le dice al SUV en Ecuador). */
function vehicleCategory(typeBody: string | null | undefined): string | undefined {
  const t = (typeBody ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/jeep|suv|todoterreno/.test(t)) return 'suv'
  if (/cabina|camioneta|pick ?up/.test(t)) return 'camioneta'
  if (/cupe|coupe|convertible|deportiv/.test(t)) return 'deportivo'
  if (/sedan|automovil/.test(t)) return 'sedan'
  if (/hatch|hatck/.test(t)) return 'hatchback'
  if (/\bvan\b|furgon|minibus/.test(t)) return 'van'
  return undefined
}

/** Estilos de subtítulo de los últimos Reels del Director IA: Claude no los repite. */
async function recentCaptionStyles(jobId: string): Promise<string[]> {
  const { data } = await getServiceClient()
    .from('video_jobs_v2')
    .select('captionStyle:gemini_analysis->plan->>captionStyle')
    .neq('id', jobId)
    .not('gemini_analysis->plan->>captionStyle', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3)
  return ((data ?? []) as Array<{ captionStyle: string | null }>).flatMap((r) => (r.captionStyle ? [r.captionStyle] : []))
}

/** Códigos del inventario que no son parte del nombre comercial: aire, puertas, tracción, caja, cabina, cilindrada. */
const INVENTORY_CODE = /^(a\/?c|\d+p|4x[24]|[24]wd|awd|fwd|t\/?a|t\/?m|at|mt|cvt|cd|cs|\d+\.\d+l?|\d+l)$/i

/**
 * Nombre comercial a partir del modelo del inventario ("escape titanium ac 2.0 5p 4x2 ta" → "Escape Titanium").
 * Con los códigos, AssemblyAI los "escucha" en el audio y Claude tiene que limpiarlos de la transcripción.
 */
export function commercialModel(raw: string): string {
  const words = raw.trim().split(/\s+/).filter((w) => w && !INVENTORY_CODE.test(w.replace(/[,;]$/, '')))
  // Con números ("RAV4", "CX-5", "L200") o siglas de versión sin vocales ("XL", "XLT", "GLS"): en mayúsculas.
  const name = words
    .map((w) => (/\d/.test(w) || (w.length <= 4 && !/[aeiou]/i.test(w)) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
  return name || raw.trim()
}

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
      const modelo = commercialModel(data.model)
      return {
        marca: data.brand,
        modelo,
        anio: data.year ?? undefined,
        version: data.version ?? undefined,
        motor: data.engine_displacement ?? undefined,
        combustible: data.fuel_type ?? undefined,
        transmision: data.transmission ?? undefined,
        kilometraje: data.mileage ?? undefined,
        color: data.color ?? undefined,
        categoria: vehicleCategory(data.type_body),
        carroceria: data.type_body ?? undefined,
        notas: modelo.toLowerCase() !== data.model.trim().toLowerCase() ? `Modelo en el inventario: ${data.model}` : undefined,
      }
    }
  }
  const canon = meta?.canonicalVehicle
  const words = (job.job_name ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    marca: canon?.brand?.trim() || words[0] || 'Vehículo',
    // El nombre del trabajo suele terminar en el año ("Ford Escape Titanium Ac 2.0 5p 4x2 Ta 2023").
    modelo: canon?.model?.trim() || commercialModel(words.slice(1).filter((w, i, a) => !(i === a.length - 1 && /^(19|20)\d{2}$/.test(w))).join(' ')) || words[0] || 'seminuevo',
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
  const director = line.match(/^\[claude\] (preparando|\S+: pensando el Reel|estrategia)/)
  if (director) {
    if (director[1] === 'preparando') return { status: 'analyzing', step: 'Claude: viendo los clips', pct: 48 }
    if (director[1] === 'estrategia') return { status: 'analyzing', step: 'Claude: plan creativo listo', pct: 62 }
    return { status: 'analyzing', step: 'Claude: diseñando el Reel', pct: 55 }
  }
  if (line.startsWith('[plan]')) return { status: 'rendering', step: 'Armando la línea de tiempo', pct: 65 }
  if (line.startsWith('[render] reintentando')) {
    return { status: 'rendering', step: 'Render 3D: reintentando con otro lector de video', pct: 66 }
  }
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
      const retry = p?.step.includes('reintentando')
      if (p && (!last || p.status !== last.status || p.step !== last.step) && (!last || retry || p.pct >= last.pct)) {
        last = p
        void updateJob(jobId, { status: p.status, current_step: p.step, progress_percentage: p.pct })
      }
    })
    readline.createInterface({ input: child.stderr }).on('line', (line) => {
      remember(line)
      // Remotion avisa por stderr cosas que no son errores (memoria del contenedor, three.js).
      if (!/memory|cgroup|docker|THREE\.Clock/i.test(line)) console.warn(`[DirectorIA][${jobId}][stderr] ${line}`)
    })
    const watchdog = setTimeout(() => {
      tail.push(`reels-studio no terminó en ${STUDIO_TIMEOUT_MS / 60000} minutos; se detuvo`)
      child.kill('SIGKILL')
    }, STUDIO_TIMEOUT_MS)
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(watchdog)
      if (code === 0) return resolve()
      const detail = tail.filter((l) => /error|falta|no se|failed|invalid|se detuvo/i.test(l)).slice(-4).join(' | ')
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

    await updateJob(jobId, {
      status: 'transcribing',
      current_step: 'Director IA: descargando clips',
      progress_percentage: 22,
      error_message: null,
    })
    const clipsDir = path.join(work, 'clips')
    await downloadClips(jobId, paths, clipsDir)

    const vehicleFile = path.join(work, 'vehiculo.json')
    const vehicle = { ...(await vehicleInfoForJob(job)), estilosRecientes: await recentCaptionStyles(jobId) }
    fs.writeFileSync(vehicleFile, JSON.stringify(vehicle, null, 2))

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
