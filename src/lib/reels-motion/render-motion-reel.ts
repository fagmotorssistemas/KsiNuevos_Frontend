/**
 * Render Motion 3D en esta máquina: recorta los clips con ffmpeg, arma la composición HyperFrames
 * (composer.ts + runtime) y la renderiza con el CLI `hyperframes` (Chrome sin ventana + ffmpeg).
 *
 * Por ahora solo corre en local (npm run dev): en Vercel no hay Chrome ni tiempo para un render
 * de varios minutos, así que ahí el pipeline sigue usando Shotstack.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Segment, SequenceItem, SubtitleBlock } from '@/lib/videos/segmenter'
import { resolveFfmpegBinaries, type FfmpegBinaries } from '@/lib/videos/resolve-ffmpeg-path'
import { pickSmartMusicTrimStartSec } from '@/lib/videos/smart-music-trim'
import { computeReelAudioBalance } from '@/lib/videos/audio-balance'
import { resolveBrandTitlePopSfxUrl, resolveClipTransitionWhooshUrl } from '@/lib/videos/shotstack'
import {
  SFX_KINDS,
  composeMotionReel,
  computeReelTimeline,
  musicSwellRanges,
  neededClipRanges,
  seedFromId,
  type SfxKind,
} from './composer'
import { detectMusicBeats } from './music-beats'
import type { MotionPlan } from './motion-plan'
import { stageMotionRuntime } from './runtime-files'

const HYPERFRAMES_BIN = path.join(process.cwd(), 'node_modules', '.bin', 'hyperframes')
const RENDER_TIMEOUT_MS = 40 * 60 * 1000
const TRANSCODE_CONCURRENCY = 2
/** Cuánto sube la música en las tomas sin habla (× el volumen balanceado con la voz). */
const MUSIC_SWELL = 1.8

export type MotionProgress = (pct: number, step: string) => Promise<void>

export interface MotionRenderInput {
  jobId: string
  sequence: SequenceItem[]
  segments: Segment[]
  subtitleBlocks: SubtitleBlock[]
  plan: MotionPlan
  highlightPhrases: string[]
  /** URL firmada de cada clip original (por índice). */
  clipUrls: string[]
  musicUrl: string
  musicTrimStartSecOverride?: number
  musicVolume?: number
  dialogueVolume?: number
}

/** Motion 3D necesita Chrome y minutos de CPU: solo fuera de Vercel y con el CLI instalado. */
export function isMotionRenderAvailable(): boolean {
  return !process.env.VERCEL && fs.existsSync(HYPERFRAMES_BIN)
}

export function motionWorkDir(jobId: string): string {
  return path.join(os.tmpdir(), 'ksi-reels-motion', jobId)
}

function run(bin: string, args: string[], opts: { onLine?: (line: string) => void; timeoutMs?: number } = {}) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, args, {
      env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' },
    })
    let out = ''
    let tail = ''
    let partial = ''
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL')
          reject(new Error(`${path.basename(bin)} superó ${Math.round(opts.timeoutMs! / 60000)} min`))
        }, opts.timeoutMs)
      : null
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      out += text
      if (!opts.onLine) return
      partial += text
      const lines = partial.split('\n')
      partial = lines.pop() ?? ''
      for (const l of lines) opts.onLine(l)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      tail = (tail + chunk.toString()).slice(-4000)
    })
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      if (code === 0) resolve(out)
      else reject(new Error(`${path.basename(bin)} terminó con código ${code}: ${tail.trim().slice(-800) || out.slice(-800)}`))
    })
  })
}

async function probeClip(ff: FfmpegBinaries, url: string): Promise<{ durationSec: number | null; hasAudio: boolean }> {
  const out = await run(ff.ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', url])
  const info = JSON.parse(out) as { format?: { duration?: string }; streams?: { codec_type?: string }[] }
  const d = Number(info.format?.duration)
  return {
    durationSec: Number.isFinite(d) && d > 0 ? d : null,
    hasAudio: (info.streams ?? []).some((s) => s.codec_type === 'audio'),
  }
}

/** Recorta y normaliza un tramo: 1080×1920, 30 fps y un cuadro clave por segundo (HyperFrames busca cuadros exactos). */
async function transcodeRange(ff: FfmpegBinaries, url: string, from: number, to: number, outFile: string) {
  await run(ff.ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', from.toFixed(3), '-i', url, '-t', (to - from).toFixed(3),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
    outFile,
  ])
}

async function downloadTo(url: string, file: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    return true
  } catch {
    return false
  }
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item)
    })
  )
}

/** Renderiza el Reel y devuelve la ruta del MP4 (dentro de motionWorkDir). */
export async function renderMotionReel(input: MotionRenderInput, onProgress: MotionProgress): Promise<string> {
  const { jobId } = input
  const log = (msg: string) => console.log(`[VideoV2Pipeline][${jobId}][Motion3D] ${msg}`)
  const ff = await resolveFfmpegBinaries()
  if (!ff) throw new Error('Motion 3D necesita ffmpeg y ffprobe instalados (o FFMPEG_PATH / FFPROBE_PATH).')
  if (!fs.existsSync(HYPERFRAMES_BIN)) throw new Error('Falta el CLI de HyperFrames: corre npm install.')

  const dir = motionWorkDir(jobId)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'clips'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'sfx'), { recursive: true })
  log(`Carpeta de trabajo: ${dir}`)

  // 1. Clips: duración, audio y solo el tramo que usa el Reel
  await onProgress(82, 'Motion 3D: preparando clips…')
  const timeline = computeReelTimeline(input.sequence)
  const used = new Set<number>()
  for (const c of timeline.cuts) {
    used.add(c.item.clip_index)
    if (c.item.visual_overlay) used.add(c.item.visual_overlay.clip_index)
  }
  const probes = new Map<number, { durationSec: number | null; hasAudio: boolean }>()
  await pool([...used], 4, async (clip) => {
    probes.set(clip, await probeClip(ff, input.clipUrls[clip]!))
  })
  const durations = new Map<number, number>()
  for (const [clip, p] of probes) if (p.durationSec) durations.set(clip, p.durationSec)

  const ranges = neededClipRanges(timeline, durations)
  const clipFiles = new Map<number, { file: string; rangeStartSec: number; hasAudio: boolean }>()
  let done = 0
  await pool([...ranges.entries()], TRANSCODE_CONCURRENCY, async ([clip, [from, to]]) => {
    const file = `clips/c${clip}.mp4`
    await transcodeRange(ff, input.clipUrls[clip]!, from, to, path.join(dir, file))
    clipFiles.set(clip, { file, rangeStartSec: from, hasAudio: probes.get(clip)?.hasAudio ?? true })
    done++
    await onProgress(82 + Math.round((done / ranges.size) * 4), `Motion 3D: preparando clips (${done}/${ranges.size})…`)
  })

  // 2. Música (tramo elegido) y volúmenes, con la misma lógica que Shotstack
  const cutStarts = timeline.cuts.map((c) => c.start)
  const musicTrim =
    input.musicTrimStartSecOverride ??
    (await pickSmartMusicTrimStartSec({ jobId, musicUrl: input.musicUrl, reelDurationSec: timeline.totalSec, cutStartTimesSec: cutStarts }))
  let musicVolume = input.musicVolume
  let dialogueVolume = input.dialogueVolume
  if (musicVolume == null || dialogueVolume == null) {
    const balance = await computeReelAudioBalance({
      jobId,
      sequence: input.sequence,
      clipUrls: input.clipUrls,
      musicUrl: input.musicUrl,
      musicTrimStartSec: musicTrim,
      reelDurationSec: timeline.totalSec,
    })
    musicVolume ??= balance.musicVolume
    dialogueVolume ??= balance.dialogueVolume
  }
  let music: { file: string; trimStartSec: number; volume: number } | null = null
  let beats: number[] = []
  if (input.musicUrl.trim()) {
    // Familiar y premium: la música sube en las tomas sin habla y en el cierre (con rampas de 0,35 s).
    const swells = input.plan.format === 'camioneta' ? [] : musicSwellRanges(timeline, input.segments)
    const swellFilter = swells.length
      ? [
          '-af',
          `volume='1+${MUSIC_SWELL - 1}*min(1,${swells
            .map(([a, b]) => `clip((t-${a.toFixed(2)})/0.35,0,1)*clip((${b.toFixed(2)}-t)/0.35,0,1)`)
            .join('+')})':eval=frame`,
        ]
      : []
    try {
      await run(ff.ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-y', '-ss', musicTrim.toFixed(3), '-i', input.musicUrl,
        '-t', (timeline.totalSec + 1).toFixed(3), '-vn', ...swellFilter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        path.join(dir, 'music.m4a'),
      ])
      music = { file: 'music.m4a', trimStartSec: 0, volume: musicVolume }
      if (input.plan.format !== 'camioneta') {
        beats = await detectMusicBeats(ff.ffmpeg, path.join(dir, 'music.m4a'), timeline.totalSec).catch(() => [])
        log(beats.length ? `Ritmo de la música: ${beats.length} golpes` : 'La música no tiene un pulso claro: sin pulsos al ritmo')
      }
    } catch (err) {
      log(`No se pudo preparar la música, sale sin música: ${err instanceof Error ? err.message : err}`)
    }
  }
  log(`Música desde ${musicTrim.toFixed(2)} s · volumen música=${musicVolume} voz=${dialogueVolume}`)

  // Efectos: los del motor (runtime/sfx) para todos; camioneta usa además los de la biblioteca de K-SI.
  stageMotionRuntime(dir)
  const sfxFiles: Partial<Record<SfxKind, string>> = {}
  for (const kind of SFX_KINDS) {
    const file = `runtime/sfx/${kind === 'impacto' ? 'boom' : kind}.mp3`
    if (fs.existsSync(path.join(dir, file))) sfxFiles[kind] = file
  }
  if (input.plan.format === 'camioneta') {
    const sfxSources: [SfxKind, string][] = [
      ['whoosh', resolveClipTransitionWhooshUrl()],
      ['pop', resolveBrandTitlePopSfxUrl()],
      ['impacto', resolveBrandTitlePopSfxUrl()],
    ]
    for (const [kind, url] of sfxSources) {
      const file = `sfx/${kind}${path.extname(new URL(url).pathname) || '.mp3'}`
      if (await downloadTo(url, path.join(dir, file))) sfxFiles[kind] = file
    }
  }

  // 3. Composición
  const { html, summary, timeline: composed } = composeMotionReel({
    sequence: input.sequence,
    segments: input.segments,
    subtitleBlocks: input.subtitleBlocks,
    plan: input.plan,
    highlightPhrases: input.highlightPhrases,
    clipFiles,
    clipDurationsSec: durations,
    music,
    dialogueVolume: dialogueVolume ?? 1,
    sfxFiles,
    seed: seedFromId(jobId),
    beats,
  })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  log(`Composición: ${composed.totalSec.toFixed(1)} s, ${summary}`)

  // 4. Render
  await onProgress(87, 'Motion 3D: renderizando (puede tardar unos minutos)…')
  const outFile = path.join(dir, 'reel.mp4')
  const started = Date.now()
  let lastPct = -1
  await run(HYPERFRAMES_BIN, ['render', dir, '-o', outFile, '--crf', '20'], {
    timeoutMs: RENDER_TIMEOUT_MS,
    onLine: (line) => {
      if (!line.startsWith('@hf-progress ')) return
      try {
        const p = JSON.parse(line.slice('@hf-progress '.length)) as { pct?: number; done?: number; total?: number }
        const pct = Math.round(p.pct ?? 0)
        if (pct >= lastPct + 5) {
          lastPct = pct
          const frames = p.total ? ` (${p.done}/${p.total} cuadros)` : ''
          void onProgress(87 + Math.round(pct * 0.1), `Motion 3D: renderizando ${pct}%${frames}…`)
        }
      } catch {
        // línea de progreso incompleta
      }
    },
  })
  log(`Render listo en ${Math.round((Date.now() - started) / 1000)} s`)
  return outFile
}
