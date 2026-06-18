/**
 * Balance dinámico voz vs música en el navegador (ffmpeg.wasm).
 * Solo importar desde componentes cliente.
 */

import {
  computeMixVolumesFromLevels,
  FALLBACK_DIALOGUE_VOLUME,
  FALLBACK_MUSIC_VOLUME,
  parseMeanVolumeDb,
  type ReelAudioBalance,
} from './audio-balance-core'
import { loadFfmpegWasm, type VideoCompressProgressFn } from './compress-video-client'
import { extractErrorMessage } from './extract-error-message'

const MAX_VOICE_SAMPLES = 4
const MAX_SAMPLE_DURATION_SEC = 14
const MAX_MUSIC_ANALYSIS_SEC = 75

export type ClientVoiceSampleInput =
  | { kind: 'file'; file: File; durationSec?: number; weightSec?: number }
  | { kind: 'url'; url: string; durationSec?: number; weightSec?: number }

export interface MeasureReelAudioBalanceInBrowserOptions {
  voiceSamples: ClientVoiceSampleInput[]
  musicUrl: string
  musicTrimStartSec?: number
  reelDurationSec?: number
  onProgress?: VideoCompressProgressFn
}

function pickVoiceSamples(samples: ClientVoiceSampleInput[]): ClientVoiceSampleInput[] {
  if (samples.length === 0) return []
  const sorted = [...samples].sort(
    (a, b) => (b.weightSec ?? b.durationSec ?? 0) - (a.weightSec ?? a.durationSec ?? 0)
  )
  return sorted.slice(0, MAX_VOICE_SAMPLES)
}

async function writeInputFromSample(
  sample: ClientVoiceSampleInput,
  fetchFile: Awaited<ReturnType<typeof loadFfmpegWasm>>['fetchFile'],
  ffmpeg: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'],
  inputName: string
): Promise<void> {
  if (sample.kind === 'file') {
    await ffmpeg.writeFile(inputName, await fetchFile(sample.file))
    return
  }
  await ffmpeg.writeFile(inputName, await fetchFile(sample.url))
}

async function measureMeanVolumeDbWithWasm(
  ffmpeg: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'],
  inputName: string,
  opts?: { trimStartSec?: number; durationSec?: number }
): Promise<number | null> {
  const args = ['-hide_banner', '-nostats']
  const trimStart = opts?.trimStartSec ?? 0
  if (trimStart > 0.01) {
    args.push('-ss', Number(trimStart.toFixed(3)).toString())
  }
  args.push('-i', inputName)
  const duration = opts?.durationSec
  if (duration != null && duration > 0.05) {
    args.push('-t', Number(Math.min(duration, MAX_MUSIC_ANALYSIS_SEC).toFixed(3)).toString())
  }
  args.push('-vn', '-af', 'volumedetect', '-f', 'null', '-')

  let stderr = ''
  const onLog = ({ message }: { message: string }) => {
    stderr += `${message}\n`
  }
  ffmpeg.on('log', onLog)
  try {
    await ffmpeg.exec(args)
  } finally {
    ffmpeg.off('log', onLog)
  }
  return parseMeanVolumeDb(stderr)
}

async function measureWeightedVoiceMeanDbWasm(
  ffmpeg: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'],
  fetchFile: Awaited<ReturnType<typeof loadFfmpegWasm>>['fetchFile'],
  samples: ClientVoiceSampleInput[]
): Promise<number | null> {
  if (samples.length === 0) return null

  const results: Array<number | null> = []
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!
    const inputName = `voice_${Date.now()}_${i}.bin`
    try {
      await writeInputFromSample(sample, fetchFile, ffmpeg, inputName)
      const durationSec = Math.min(
        sample.durationSec ?? MAX_SAMPLE_DURATION_SEC,
        MAX_SAMPLE_DURATION_SEC
      )
      results.push(
        await measureMeanVolumeDbWithWasm(ffmpeg, inputName, {
          trimStartSec: 0,
          durationSec,
        })
      )
    } finally {
      try {
        await ffmpeg.deleteFile(inputName)
      } catch {
        /* best-effort */
      }
    }
  }

  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < samples.length; i++) {
    const db = results[i]
    if (db == null) continue
    const sample = samples[i]!
    const w = sample.weightSec ?? sample.durationSec ?? 1
    weightedSum += db * w
    totalWeight += w
  }
  if (totalWeight <= 0) return null
  return weightedSum / totalWeight
}

/**
 * Mide voz y música en el navegador. Si falla, devuelve fallback seguro (música 4%, voz 100%).
 */
export async function measureReelAudioBalanceInBrowser(
  opts: MeasureReelAudioBalanceInBrowserOptions
): Promise<ReelAudioBalance> {
  const { voiceSamples, musicUrl, musicTrimStartSec = 0, reelDurationSec, onProgress } = opts

  const fallback = (): ReelAudioBalance => ({
    musicVolume: FALLBACK_MUSIC_VOLUME,
    dialogueVolume: FALLBACK_DIALOGUE_VOLUME,
    voiceMeanDb: null,
    musicMeanDb: null,
    source: 'fallback',
  })

  if (typeof window === 'undefined') {
    return fallback()
  }

  const picked = pickVoiceSamples(voiceSamples)
  const musicUrlTrimmed = musicUrl.trim()
  if (picked.length === 0 || !musicUrlTrimmed) {
    console.warn('[AudioBalanceClient] Sin muestras de voz o URL de música; usando fallback.')
    return fallback()
  }

  try {
    onProgress?.('Midiendo niveles de voz y música (ffmpeg en el navegador)…')
    const { ffmpeg, fetchFile } = await loadFfmpegWasm(onProgress)

    const musicDurationSec = Math.min(
      Math.max(reelDurationSec ?? MAX_MUSIC_ANALYSIS_SEC, 0.5),
      MAX_MUSIC_ANALYSIS_SEC
    )

    const voiceMeanDb = await measureWeightedVoiceMeanDbWasm(ffmpeg, fetchFile, picked)

    let musicMeanDb: number | null = null
    const musicInputName = `music_${Date.now()}.bin`
    try {
      await ffmpeg.writeFile(musicInputName, await fetchFile(musicUrlTrimmed))
      musicMeanDb = await measureMeanVolumeDbWithWasm(ffmpeg, musicInputName, {
        trimStartSec: Math.max(0, musicTrimStartSec),
        durationSec: musicDurationSec,
      })
    } finally {
      try {
        await ffmpeg.deleteFile(musicInputName)
      } catch {
        /* best-effort */
      }
    }

    if (voiceMeanDb == null || musicMeanDb == null) {
      console.warn(
        `[AudioBalanceClient] Medición incompleta (voz=${voiceMeanDb ?? 'n/a'} dB, música=${musicMeanDb ?? 'n/a'} dB). Fallback.`
      )
      return fallback()
    }

    const { musicVolume, dialogueVolume } = computeMixVolumesFromLevels(voiceMeanDb, musicMeanDb)
    console.log(
      `[AudioBalanceClient] voz≈${voiceMeanDb.toFixed(1)} dB, música≈${musicMeanDb.toFixed(1)} dB → ` +
        `música=${musicVolume}, voz=${dialogueVolume}`
    )
    onProgress?.(`Mezcla calculada: música ${Math.round(musicVolume * 100)}%, voz ${Math.round(dialogueVolume * 100)}%`)

    return {
      musicVolume,
      dialogueVolume,
      voiceMeanDb,
      musicMeanDb,
      source: 'measured',
    }
  } catch (err) {
    console.warn(
      `[AudioBalanceClient] ffmpeg.wasm falló: ${extractErrorMessage(err, 'error desconocido')}. Usando fallback.`
    )
    return fallback()
  }
}
