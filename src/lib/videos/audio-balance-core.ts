/**
 * Lógica pura de balance voz vs música (sin Node.js ni ffmpeg).
 * Compartida entre servidor (`audio-balance.ts`) y navegador (`audio-balance-client.ts`).
 */

/**
 * Gap voz–música (dB). Más bajo = música más audible.
 * 6 ≈ se nota de fondo sin tapar voz (10/14 quedaban flojos en reels).
 */
const TARGET_MUSIC_BELOW_VOICE_DB = 6

/** Shotstack rechaza `asset.volume` > 1 (HTTP 400). */
export const SHOTSTACK_MAX_ASSET_VOLUME = 1

export const FALLBACK_MUSIC_VOLUME = 0.22
export const FALLBACK_DIALOGUE_VOLUME = 1

const MIN_MUSIC_VOLUME = 0.12
/** Techo: antes 0.1–0.32; reels pedían más presencia de pista. */
const MAX_MUSIC_VOLUME = 0.45

export interface ReelAudioBalance {
  musicVolume: number
  dialogueVolume: number
  voiceMeanDb: number | null
  musicMeanDb: number | null
  source: 'measured' | 'fallback'
}

export function parseMeanVolumeDb(stderr: string): number | null {
  const match = stderr.match(/mean_volume:\s*(-?\s*inf|nan|-?\d+(?:\.\d+)?)\s*dB/i)
  if (!match) return null
  const raw = match[1]!.replace(/\s+/g, '').toLowerCase()
  if (raw === '-inf' || raw === 'inf' || raw === 'nan') return -120
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Asegura volumen válido para la API de Shotstack (0..1). */
export function clampShotstackAssetVolume(volume: number): number {
  return Number(clamp(volume, 0, SHOTSTACK_MAX_ASSET_VOLUME).toFixed(3))
}

export function computeMixVolumesFromLevels(
  voiceMeanDb: number,
  musicMeanDb: number
): Pick<ReelAudioBalance, 'musicVolume' | 'dialogueVolume'> {
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
