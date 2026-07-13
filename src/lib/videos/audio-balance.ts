/**
 * Balance dinámico voz vs música de fondo por Reel (servidor).
 * Mide niveles con ffmpeg (volumedetect) y calcula volúmenes de mezcla para Shotstack.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

import { resolveFfmpegBinaries } from '@/lib/videos/resolve-ffmpeg-path'
import type { SequenceItem } from './segmenter'
import { isPipelineInputMeta, normalizeReelAudioVolume } from './clip-config'
import {
  clampShotstackAssetVolume,
  computeMixVolumesFromLevels,
  FALLBACK_DIALOGUE_VOLUME,
  FALLBACK_MUSIC_VOLUME,
  parseMeanVolumeDb,
  type ReelAudioBalance,
} from './audio-balance-core'

export {
  clampShotstackAssetVolume,
  computeMixVolumesFromLevels,
  FALLBACK_DIALOGUE_VOLUME,
  FALLBACK_MUSIC_VOLUME,
  parseMeanVolumeDb,
  SHOTSTACK_MAX_ASSET_VOLUME,
  type ReelAudioBalance,
} from './audio-balance-core'

const execFileAsync = promisify(execFile)

const FFMPEG_TIMEOUT_MS = 90_000
const MAX_VOICE_SAMPLES = 4
const MAX_SAMPLE_DURATION_SEC = 14
const MAX_MUSIC_ANALYSIS_SEC = 75

export interface ReelAudioRenderVolumes {
  musicVolume?: number
  dialogueVolume?: number
}

/** Lee volúmenes medidos en el navegador desde `selected_clips` del job. */
export function reelAudioVolumesFromPipelineMeta(selectedClips: unknown): ReelAudioRenderVolumes {
  if (!isPipelineInputMeta(selectedClips)) return {}
  const musicVolume = normalizeReelAudioVolume(selectedClips.reelMusicVolume)
  const dialogueVolume = normalizeReelAudioVolume(selectedClips.reelDialogueVolume)
  if (musicVolume == null && dialogueVolume == null) return {}
  return {
    ...(musicVolume != null ? { musicVolume } : {}),
    ...(dialogueVolume != null ? { dialogueVolume } : {}),
  }
}

interface VoiceSample {
  url: string
  trimStartSec: number
  durationSec: number
  weightSec: number
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
    const binaries = await resolveFfmpegBinaries()
    if (!binaries) {
      console.warn(`[VideoV2Pipeline][${jobId}][AudioBalance] ffmpeg no disponible`)
      return null
    }

    const { stderr } = await execFileAsync(binaries.ffmpeg, args, {
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
      `música≈${musicMeanDb.toFixed(1)} dB → música=${musicVolume}, voz=${dialogueVolume}`
  )

  return {
    musicVolume,
    dialogueVolume,
    voiceMeanDb,
    musicMeanDb,
    source: 'measured',
  }
}
