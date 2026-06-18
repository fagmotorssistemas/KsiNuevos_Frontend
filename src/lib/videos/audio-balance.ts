/**
 * Balance dinámico voz vs música de fondo por Reel.
 * Mide niveles con ffmpeg (volumedetect) y calcula volúmenes de mezcla para Shotstack.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

import type { SequenceItem } from './segmenter'

const execFileAsync = promisify(execFile)

const FFMPEG_TIMEOUT_MS = 90_000
const MAX_VOICE_SAMPLES = 4
const MAX_SAMPLE_DURATION_SEC = 14
const MAX_MUSIC_ANALYSIS_SEC = 75

/** Música debe quedar al menos N dB por debajo de la voz en la mezcla final. */
const TARGET_MUSIC_BELOW_VOICE_DB = 14

/** Shotstack rechaza `asset.volume` > 1 (HTTP 400). */
export const SHOTSTACK_MAX_ASSET_VOLUME = 1

export const FALLBACK_MUSIC_VOLUME = 0.04
export const FALLBACK_DIALOGUE_VOLUME = 1

const MIN_MUSIC_VOLUME = 0.015
const MAX_MUSIC_VOLUME = 0.1
export interface ReelAudioBalance {
  musicVolume: number
  dialogueVolume: number
  voiceMeanDb: number | null
  musicMeanDb: number | null
  source: 'measured' | 'fallback'
}

interface VoiceSample {
  url: string
  trimStartSec: number
  durationSec: number
  weightSec: number
}

function parseMeanVolumeDb(stderr: string): number | null {
  const match = stderr.match(/mean_volume:\s*(-?\s*inf|nan|-?\d+(?:\.\d+)?)\s*dB/i)
  if (!match) return null
  const raw = match[1]!.replace(/\s+/g, '').toLowerCase()
  if (raw === '-inf' || raw === 'inf' || raw === 'nan') return -120
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

async function measureMeanVolumeDbFromUrl(
  url: string,
  jobId: string,
  opts?: { trimStartSec?: number; durationSec?: number }
): Promise<number | null> {
  const args = ['-hide_banner', '-nostats']
  const trimStart = opts?.trimStartSec ?? 0
  if (trimStart > 0.01) {
    args.push('-ss', Number(trimStart.toFixed(3)).toString())
  }
  args.push('-i', url)
  const duration = opts?.durationSec
  if (duration != null && duration > 0.05) {
    args.push('-t', Number(Math.min(duration, MAX_MUSIC_ANALYSIS_SEC).toFixed(3)).toString())
  }
  args.push('-vn', '-af', 'volumedetect', '-f', 'null', '-')

  try {
    const { stderr } = await execFileAsync('ffmpeg', args, {
      timeout: FFMPEG_TIMEOUT_MS,
      maxBuffer: 12 * 1024 * 1024,
    })
    return parseMeanVolumeDb(stderr)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[VideoV2Pipeline][${jobId}][AudioBalance] ffmpeg volumedetect falló: ${msg}`)
    return null
  }
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function pickVoiceSamples(sequence: SequenceItem[], clipUrls: string[]): VoiceSample[] {
  if (sequence.length === 0) return []
  const sorted = [...sequence].sort((a, b) => b.trim_duration - a.trim_duration)
  const picked = sorted.slice(0, MAX_VOICE_SAMPLES)
  return picked.map((item) => {
    const weightSec = item.trim_duration
    const durationSec = Math.min(weightSec, MAX_SAMPLE_DURATION_SEC)
    return {
      url: clipUrls[item.clip_index] ?? clipUrls[0]!,
      trimStartSec: item.trim_start,
      durationSec,
      weightSec,
    }
  })
}

async function measureWeightedVoiceMeanDb(
  samples: VoiceSample[],
  jobId: string
): Promise<number | null> {
  if (samples.length === 0) return null

  const results = await Promise.all(
    samples.map((s) =>
      measureMeanVolumeDbFromUrl(s.url, jobId, {
        trimStartSec: s.trimStartSec,
        durationSec: s.durationSec,
      })
    )
  )

  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < samples.length; i++) {
    const db = results[i]
    if (db == null) continue
    const w = samples[i]!.weightSec
    weightedSum += db * w
    totalWeight += w
  }
  if (totalWeight <= 0) return null
  return weightedSum / totalWeight
}

/** Asegura volumen válido para la API de Shotstack (0..1). */
export function clampShotstackAssetVolume(volume: number): number {
  return Number(clamp(volume, 0, SHOTSTACK_MAX_ASSET_VOLUME).toFixed(3))
}

export function computeMixVolumesFromLevels(
  voiceMeanDb: number,
  musicMeanDb: number
): Pick<ReelAudioBalance, 'musicVolume' | 'dialogueVolume'> {
  // Shotstack no permite subir la voz por encima de 1.0; compensamos bajando más la música.
  let targetGapDb = TARGET_MUSIC_BELOW_VOICE_DB
  if (voiceMeanDb < -31) {
    const quietnessDb = -31 - voiceMeanDb
    targetGapDb += Math.min(10, quietnessDb * 0.4)
  }

  const musicVolumeDb = voiceMeanDb - targetGapDb - musicMeanDb
  const musicVolume = clampShotstackAssetVolume(
    clamp(dbToLinear(musicVolumeDb), MIN_MUSIC_VOLUME, MAX_MUSIC_VOLUME)
  )

  return {
    musicVolume,
    dialogueVolume: SHOTSTACK_MAX_ASSET_VOLUME,
  }
}

export interface ComputeReelAudioBalanceOptions {
  jobId: string
  sequence: SequenceItem[]
  clipUrls: string[]
  musicUrl: string
  musicTrimStartSec: number
  reelDurationSec: number
}

/**
 * Mide voz (segmentos del Reel) y música (ventana del trim) y devuelve volúmenes para Shotstack.
 */
export async function computeReelAudioBalance(
  opts: ComputeReelAudioBalanceOptions
): Promise<ReelAudioBalance> {
  const { jobId, sequence, clipUrls, musicUrl, musicTrimStartSec, reelDurationSec } = opts

  const voiceSamples = pickVoiceSamples(sequence, clipUrls)
  const musicDurationSec = Math.min(
    Math.max(reelDurationSec, 0.5),
    MAX_MUSIC_ANALYSIS_SEC
  )

  const [voiceMeanDb, musicMeanDb] = await Promise.all([
    measureWeightedVoiceMeanDb(voiceSamples, jobId),
    musicUrl.trim()
      ? measureMeanVolumeDbFromUrl(musicUrl.trim(), jobId, {
          trimStartSec: Math.max(0, musicTrimStartSec),
          durationSec: musicDurationSec,
        })
      : Promise.resolve(null),
  ])

  if (voiceMeanDb == null || musicMeanDb == null) {
    console.warn(
      `[VideoV2Pipeline][${jobId}][AudioBalance] Medición incompleta ` +
        `(voz=${voiceMeanDb ?? 'n/a'} dB, música=${musicMeanDb ?? 'n/a'} dB). ` +
        `Usando fallback música=${FALLBACK_MUSIC_VOLUME}, voz=${FALLBACK_DIALOGUE_VOLUME}.`
    )
    return {
      musicVolume: clampShotstackAssetVolume(FALLBACK_MUSIC_VOLUME),
      dialogueVolume: clampShotstackAssetVolume(FALLBACK_DIALOGUE_VOLUME),
      voiceMeanDb,
      musicMeanDb,
      source: 'fallback',
    }
  }

  const { musicVolume, dialogueVolume } = computeMixVolumesFromLevels(voiceMeanDb, musicMeanDb)

  console.log(
    `[VideoV2Pipeline][${jobId}][AudioBalance] voz≈${voiceMeanDb.toFixed(1)} dB, ` +
      `música≈${musicMeanDb.toFixed(1)} dB → música=${musicVolume}, voz=${dialogueVolume} ` +
      `(objetivo ${TARGET_MUSIC_BELOW_VOICE_DB} dB bajo voz)`
  )

  return {
    musicVolume,
    dialogueVolume,
    voiceMeanDb,
    musicMeanDb,
    source: 'measured',
  }
}
