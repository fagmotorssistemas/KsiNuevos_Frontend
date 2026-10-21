/**
 * Cuadros de video para Claude — Claude no recibe video, así que se le mandan cuadros fijos de cada
 * clip (JPEG, lado mayor 960 px) con su segundo, repartidos para no pasar de ~90 en todo el Reel.
 *
 * Usa el binario ffmpeg del sistema (mismo patrón que compression.ts).
 * Si ffmpeg no está disponible o falla, el pipeline continúa sin análisis visual.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { promisify } from 'util'
import { execFile } from 'child_process'
import { resolveFfmpegBinaries, type FfmpegBinaries } from '@/lib/videos/resolve-ffmpeg-path'

const execFileAsync = promisify(execFile)

const DOWNLOAD_TIMEOUT_MS = 5 * 60_000
const FFMPEG_TIMEOUT_MS = 2 * 60_000
/** Cuadros por Reel (todos los clips juntos) y tope duro por pedido a la API. */
const FRAME_BUDGET = 90
const MAX_FRAMES = 100
const MAX_FPS = 2
const MIN_FPS = 0.2

export interface VideoFrame {
  /** Segundo dentro del clip. */
  sec: number
  /** JPEG en base64. */
  data: string
}

export interface ClipFrames {
  /** Índice del clip (0 = primer video subido), igual que en el mapa de segmentos. */
  clipIndex: number
  durationSec: number
  frames: VideoFrame[]
}

// ─── Descarga video de Supabase a /tmp ────────────────────────────────────────

async function downloadToTemp(signedUrl: string, jobId: string, suffix: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `claude_v2_${jobId}_${suffix}_original.mp4`)

  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)

  const response = await fetch(signedUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Error descargando video (HTTP ${response.status})`)
  if (!response.body) throw new Error('La respuesta no tiene body stream')

  const fileStream = fs.createWriteStream(tmpPath)
  const reader = response.body.getReader()

  await new Promise<void>((resolve, reject) => {
    fileStream.on('error', reject)
    fileStream.on('finish', resolve)

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { fileStream.end(); break }
          fileStream.write(value)
        }
      } catch (err) {
        fileStream.destroy()
        reject(err)
      }
    }
    pump()
  })

  const stats = fs.statSync(tmpPath)
  console.log(`[VideoV2ClaudeFrames][${jobId}] Descargado ${suffix}: ${(stats.size / 1024 / 1024).toFixed(1)} MB`)

  return tmpPath
}

// ─── ffprobe / ffmpeg ─────────────────────────────────────────────────────────

async function probeDurationSec(binaries: FfmpegBinaries, file: string): Promise<number> {
  const { stdout } = await execFileAsync(
    binaries.ffprobe,
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { timeout: 30_000 }
  )
  const sec = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(sec) || sec <= 0) throw new Error(`Duración inválida (${stdout.trim()})`)
  return sec
}

async function extractFrames(binaries: FfmpegBinaries, file: string, fps: number, durationSec: number): Promise<VideoFrame[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude_frames_'))
  try {
    await execFileAsync(binaries.ffmpeg, [
      '-v', 'error',
      '-i', file,
      '-vf', `fps=${fps},scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'`,
      '-q:v', '5',
      '-y',
      path.join(dir, 'f-%04d.jpg'),
    ], { timeout: FFMPEG_TIMEOUT_MS })
    return fs
      .readdirSync(dir)
      .sort()
      .map((name, i) => ({ sec: i / fps, data: fs.readFileSync(path.join(dir, name)).toString('base64') }))
      .filter((f) => f.sec <= durationSec)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** Si aún hay demasiados cuadros, deja uno de cada tantos (parejo en todo el Reel). */
function capFrames(clips: ClipFrames[]): ClipFrames[] {
  const total = clips.reduce((n, c) => n + c.frames.length, 0)
  if (total <= MAX_FRAMES) return clips
  const step = total / MAX_FRAMES
  let next = 0
  let i = 0
  return clips.map((c) => ({
    ...c,
    frames: c.frames.filter(() => {
      const keep = i >= next
      if (keep) next += step
      i++
      return keep
    }),
  }))
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Descarga los clips, decide cuántos cuadros por segundo caben y los extrae.
 * Limpia los archivos temporales de /tmp al terminar (éxito o fallo).
 */
export async function prepareVideoFramesForClaude(
  signedUrls: string[],
  jobId: string,
  concurrency = 2
): Promise<ClipFrames[]> {
  const binaries = await resolveFfmpegBinaries()
  if (!binaries) throw new Error('spawn ffmpeg ENOENT')

  console.log(`[VideoV2ClaudeFrames][${jobId}] Preparando cuadros de ${signedUrls.length} video(s) (concurrencia ${concurrency})`)

  const files: string[] = new Array(signedUrls.length)
  try {
    let nextIndex = 0
    async function worker() {
      while (nextIndex < signedUrls.length) {
        const i = nextIndex++
        files[i] = await downloadToTemp(signedUrls[i]!, jobId, `clip${i}`)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, signedUrls.length) }, () => worker()))

    const durations = await Promise.all(files.map((f) => probeDurationSec(binaries, f)))
    const totalSec = durations.reduce((s, d) => s + d, 0)
    const fps = Math.min(MAX_FPS, Math.max(MIN_FPS, FRAME_BUDGET / Math.max(1, totalSec)))

    const clips: ClipFrames[] = []
    for (let i = 0; i < files.length; i++) {
      clips.push({ clipIndex: i, durationSec: durations[i]!, frames: await extractFrames(binaries, files[i]!, fps, durations[i]!) })
    }
    const capped = capFrames(clips)
    console.log(
      `[VideoV2ClaudeFrames][${jobId}] ${capped.reduce((n, c) => n + c.frames.length, 0)} cuadros ` +
        `(${fps.toFixed(2)} por segundo, ${totalSec.toFixed(1)} s de video)`
    )
    return capped
  } finally {
    for (const f of files) {
      if (f && fs.existsSync(f)) {
        try { fs.unlinkSync(f) } catch { /* best-effort */ }
      }
    }
  }
}
