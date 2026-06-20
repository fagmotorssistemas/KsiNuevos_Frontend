import {
  FALLBACK_DIALOGUE_VOLUME,
  FALLBACK_MUSIC_VOLUME,
} from '@/lib/videos/audio-balance-core'

const NEST_TIMEOUT_MS = 125_000

export type NestVoiceSampleInput = {
  url: string
  trimStartSec?: number
  durationSec?: number
  weightSec?: number
}

export type NestMeasureAudioResult = {
  reelMusicVolume: number
  reelDialogueVolume: number
  voiceMeanDb: number | null
  musicMeanDb: number | null
  source: 'measured' | 'fallback'
  nestReachable: boolean
}

function fallbackResult(nestReachable: boolean): NestMeasureAudioResult {
  return {
    reelMusicVolume: FALLBACK_MUSIC_VOLUME,
    reelDialogueVolume: FALLBACK_DIALOGUE_VOLUME,
    voiceMeanDb: null,
    musicMeanDb: null,
    source: 'fallback',
    nestReachable,
  }
}

export async function callNestMeasureAudioServer(params: {
  jobId: string
  musicUrl: string
  musicTrimStartSec?: number
  reelDurationSec?: number
  voiceSamples: NestVoiceSampleInput[]
}): Promise<NestMeasureAudioResult> {
  const musicUrl = params.musicUrl.trim()
  const voiceSamples = params.voiceSamples.filter((s) => s.url?.trim())

  if (!musicUrl || voiceSamples.length === 0) {
    console.warn(`[nest-measure-audio][${params.jobId}] Payload incompleto; fallback.`)
    return fallbackResult(false)
  }

  const backendUrl = process.env.BACKEND_INTERNAL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!backendUrl || !secret) {
    console.error('[nest-measure-audio] Faltan BACKEND_INTERNAL_URL o INTERNAL_API_SECRET')
    return fallbackResult(false)
  }

  try {
    const response = await fetch(`${backendUrl}/internal/video/measure-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({
        jobId: params.jobId,
        musicUrl,
        musicTrimStartSec: params.musicTrimStartSec ?? 0,
        reelDurationSec: params.reelDurationSec,
        voiceSamples,
      }),
      signal: AbortSignal.timeout(NEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(
        `[nest-measure-audio][${params.jobId}] Nest HTTP ${response.status}: ${text.slice(0, 300)}`
      )
      return fallbackResult(true)
    }

    const result = (await response.json()) as {
      reelMusicVolume?: number
      reelDialogueVolume?: number
      voiceMeanDb?: number | null
      musicMeanDb?: number | null
      source?: string
    }

    console.log(
      `[nest-measure-audio][${params.jobId}] source=${result.source ?? 'unknown'} ` +
        `música=${result.reelMusicVolume} voz=${result.reelDialogueVolume}`
    )

    return {
      reelMusicVolume: result.reelMusicVolume ?? FALLBACK_MUSIC_VOLUME,
      reelDialogueVolume: result.reelDialogueVolume ?? FALLBACK_DIALOGUE_VOLUME,
      voiceMeanDb: result.voiceMeanDb ?? null,
      musicMeanDb: result.musicMeanDb ?? null,
      source: result.source === 'measured' ? 'measured' : 'fallback',
      nestReachable: true,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[nest-measure-audio][${params.jobId}] Error: ${msg}`)
    return fallbackResult(false)
  }
}

export function buildNestVoiceSamplesFromPaths(
  paths: string[],
  clipDurations: (number | null)[] | undefined,
  excludeIndices: number[]
): NestVoiceSampleInput[] {
  return paths
    .map((path, i) => ({ path, i }))
    .filter(({ i }) => !excludeIndices.includes(i))
    .map(({ path, i }) => ({
      url: path,
      trimStartSec: 0,
      durationSec: clipDurations?.[i] ?? undefined,
      weightSec: clipDurations?.[i] ?? undefined,
    }))
}

export function sumClipDurationsSec(clipDurations?: (number | null)[]): number | undefined {
  if (!clipDurations?.length) return undefined
  const total = clipDurations.reduce<number>(
    (acc, d) => acc + (typeof d === 'number' && Number.isFinite(d) ? d : 0),
    0
  )
  return total > 0 ? total : undefined
}
