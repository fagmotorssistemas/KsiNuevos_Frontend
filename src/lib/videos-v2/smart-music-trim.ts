/**
 * Elige un `trim_start` en la pista de música para alinear mejor con la duración del Reel:
 * ventana con mayor energía media (momentary loudness vía ffmpeg ebur128) y refino leve
 * hacia coincidencia con los inicios de corte en la timeline del vídeo.
 *
 * Si ffmpeg no está disponible o falla, usa heurística por duración conocida del MP3.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

import { tryProbeMediaDurationSecondsFromUrl } from './probe-video'

const execFileAsync = promisify(execFile)

const FFMPEG_TIMEOUT_MS = 120_000
const COARSE_STEP_SEC = 0.35
const REFINE_RADIUS_SEC = 1.0
const REFINE_STEP_SEC = 0.05

/** Tramo inicial del reel donde debe sonar fuerte (segundos en timeline del reel = fuente desde trim). */
function headWindowSec(reelDurationSec: number): number {
  return Math.min(1.25, Math.max(0.55, reelDurationSec * 0.22))
}

function mDbToEnergy(mDb: number): number {
  if (!Number.isFinite(mDb) || mDb <= -100) return 1e-10
  return Math.pow(10, mDb / 20)
}

/** Parsea stderr de `ffmpeg ... ebur128` → muestras (t, M en dB). */
function parseEbur128MomentarySeries(stderr: string): { t: number; mDb: number }[] {
  const out: { t: number; mDb: number }[] = []
  const lines = stderr.split('\n')
  // Ej.: t: 0.399977   TARGET:-23 LUFS    M: -21.8 S:-120.7     I: -21.8 LUFS
  const lineRe = /t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?inf|nan|[-\d.]+)/i
  for (const line of lines) {
    const m = line.match(lineRe)
    if (!m) continue
    const t = parseFloat(m[1]!)
    const raw = m[2]!.trim().toLowerCase()
    const mDb = raw === '-inf' || raw === 'nan' ? -120 : parseFloat(raw)
    if (!Number.isFinite(t) || !Number.isFinite(mDb)) continue
    out.push({ t, mDb })
  }
  return out
}

async function runEbur128Analysis(musicUrl: string, jobId: string): Promise<{ t: number; mDb: number }[] | null> {
  try {
    const { stderr } = await execFileAsync(
      'ffmpeg',
      ['-hide_banner', '-i', musicUrl, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'],
      { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 25 * 1024 * 1024 }
    )
    const series = parseEbur128MomentarySeries(stderr)
    if (series.length < 8) {
      console.warn(`[VideoV2Pipeline][${jobId}][Music] ebur128 devolvió pocas muestras (${series.length})`)
      return null
    }
    return series
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[VideoV2Pipeline][${jobId}][Music] ffmpeg ebur128 no disponible o falló: ${msg}`)
    return null
  }
}

function meanEnergyInWindow(
  series: { t: number; mDb: number }[],
  winStart: number,
  winEnd: number
): { mean: number; n: number } {
  let sum = 0
  let n = 0
  for (const p of series) {
    if (p.t < winStart) continue
    if (p.t >= winEnd) continue
    sum += mDbToEnergy(p.mDb)
    n++
  }
  if (n === 0) return { mean: 0, n: 0 }
  return { mean: sum / n, n }
}

/** Derivada aproximada |dM/dt| en cada punto (picos ≈ golpes / subidas de energía). */
function onsetWeights(series: { t: number; mDb: number }[]): Map<number, number> {
  const w = new Map<number, number>()
  for (let i = 1; i < series.length; i++) {
    const dt = series[i]!.t - series[i - 1]!.t
    if (dt <= 0) continue
    const d = Math.abs(series[i]!.mDb - series[i - 1]!.mDb) / dt
    w.set(series[i]!.t, d)
  }
  return w
}

function cutAlignmentScore(
  trimStart: number,
  reelDurationSec: number,
  cutStartTimesSec: number[],
  onset: Map<number, number>,
  series: { t: number; mDb: number }[]
): number {
  if (cutStartTimesSec.length === 0) return 0
  let sum = 0
  let c = 0
  for (const cut of cutStartTimesSec) {
    if (cut <= 0.02 || cut >= reelDurationSec - 0.05) continue
    const mt = trimStart + cut
    let local = onset.get(mt) ?? 0
    if (local === 0) {
      for (const p of series) {
        if (Math.abs(p.t - mt) < 0.12) {
          local = Math.max(local, onset.get(p.t) ?? 0)
        }
      }
    }
    sum += local
    c++
  }
  if (c === 0) return 0
  return sum / c
}

/** Puntuación: prioridad al volumen en los primeros segundos del reel (no solo la media de toda la ventana). */
function windowScore(
  series: { t: number; mDb: number }[],
  s: number,
  reelDurationSec: number,
  cutStartTimesSec: number[],
  onset: Map<number, number>
): { score: number; n: number } {
  const head = headWindowSec(reelDurationSec)
  const headStats = meanEnergyInWindow(series, s, s + head)
  const fullStats = meanEnergyInWindow(series, s, s + reelDurationSec)
  if (fullStats.n < 4 || headStats.n < 2) return { score: -Infinity, n: 0 }
  const align = cutAlignmentScore(s, reelDurationSec, cutStartTimesSec, onset, series)
  const score =
    5.2 * headStats.mean +
    1.0 * fullStats.mean +
    align * 0.00035
  return { score, n: fullStats.n }
}

/**
 * Si el inicio del corte sigue siendo un build-up, avanza trim_start hasta que el arranque sea fuerte
 * respecto al cuerpo de la ventana (sin pasarse de maxStart).
 */
function nudgeForwardForLoudAttack(
  series: { t: number; mDb: number }[],
  s: number,
  reelDurationSec: number,
  maxStart: number
): number {
  const head = headWindowSec(reelDurationSec)
  let cur = Math.max(0, Math.min(maxStart, s))
  const minRatio = 0.58
  const step = 0.1
  const maxSteps = 70

  for (let k = 0; k < maxSteps; k++) {
    const fullM = meanEnergyInWindow(series, cur, cur + reelDurationSec).mean
    const headM = meanEnergyInWindow(series, cur, cur + head).mean
    if (fullM < 1e-12) break
    if (headM / fullM >= minRatio) break
    if (cur >= maxStart - 1e-4) break
    cur = Math.min(maxStart, cur + step)
  }
  return Number(cur.toFixed(3))
}

function bestTrimFromSeries(
  series: { t: number; mDb: number }[],
  musicDurationSec: number,
  reelDurationSec: number,
  cutStartTimesSec: number[],
  jobId: string
): number {
  const maxStart = Math.max(0, musicDurationSec - reelDurationSec)
  if (maxStart <= 0.05) return 0

  const onset = onsetWeights(series)

  let bestS = 0
  let bestScore = -Infinity
  for (let s = 0; s <= maxStart + 1e-6; s += COARSE_STEP_SEC) {
    const { score, n } = windowScore(series, s, reelDurationSec, cutStartTimesSec, onset)
    if (n < 4) continue
    if (score > bestScore) {
      bestScore = score
      bestS = s
    }
  }

  let refined = bestS
  for (
    let s = Math.max(0, bestS - REFINE_RADIUS_SEC);
    s <= Math.min(maxStart, bestS + REFINE_RADIUS_SEC) + 1e-9;
    s += REFINE_STEP_SEC
  ) {
    const { score, n } = windowScore(series, s, reelDurationSec, cutStartTimesSec, onset)
    if (n < 4) continue
    if (score > bestScore) {
      bestScore = score
      refined = s
    }
  }

  let clamped = Math.max(0, Math.min(maxStart, refined))
  clamped = nudgeForwardForLoudAttack(series, clamped, reelDurationSec, maxStart)

  console.log(
    `[VideoV2Pipeline][${jobId}][Music] Ventana (ataque al inicio): trim_start=${clamped.toFixed(2)}s ` +
      `(pista≈${musicDurationSec.toFixed(1)}s, reel=${reelDurationSec.toFixed(1)}s, muestras=${series.length})`
  )
  return Number(clamped.toFixed(3))
}

function heuristicTrimStart(
  musicDurationSec: number | null,
  reelDurationSec: number,
  _cutStartTimesSec: number[],
  jobId: string
): number {
  if (musicDurationSec == null || !Number.isFinite(musicDurationSec) || musicDurationSec <= reelDurationSec + 0.5) {
    return 0
  }
  // Sin análisis de audio: no adivinar un punto al 28 % (suele dejar el inicio del reel en un build-up).
  console.log(
    `[VideoV2Pipeline][${jobId}][Music] Sin ffmpeg: trim_start=0s (pista≈${musicDurationSec.toFixed(1)}s, reel≈${reelDurationSec.toFixed(1)}s)`
  )
  return 0
}

export interface PickSmartMusicTrimOptions {
  jobId: string
  musicUrl: string
  reelDurationSec: number
  cutStartTimesSec: number[]
}

/**
 * Segundos desde el inicio del archivo de música donde conviene `trim_start` en Creatomate.
 */
export async function pickSmartMusicTrimStartSec(opts: PickSmartMusicTrimOptions): Promise<number> {
  const { jobId, musicUrl, reelDurationSec, cutStartTimesSec } = opts
  if (!Number.isFinite(reelDurationSec) || reelDurationSec < 0.5) return 0

  const musicDurationSec = await tryProbeMediaDurationSecondsFromUrl(musicUrl, jobId)

  if (musicDurationSec != null && musicDurationSec <= reelDurationSec + 0.05) {
    return 0
  }

  const series = await runEbur128Analysis(musicUrl, jobId)
  if (series && series.length >= 8 && musicDurationSec != null) {
    return bestTrimFromSeries(series, musicDurationSec, reelDurationSec, cutStartTimesSec, jobId)
  }
  if (series && series.length >= 8) {
    const inferredDur = Math.max(series[series.length - 1]!.t + 0.5, reelDurationSec + 0.5)
    return bestTrimFromSeries(series, inferredDur, reelDurationSec, cutStartTimesSec, jobId)
  }

  return heuristicTrimStart(musicDurationSec, reelDurationSec, cutStartTimesSec, jobId)
}
