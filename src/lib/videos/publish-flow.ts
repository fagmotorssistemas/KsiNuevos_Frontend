import type { VideoJob, VideoSocialPublishStage } from './types'
import { getInstagramTokenStatus } from '@/lib/videos/instagram-token'

export function resolveSocialPublishStage(job: VideoJob): VideoSocialPublishStage | null {
  if (job.status !== 'completed') return null
  const s = job.social_publish_stage
  if (s === 'aprobado' || s === 'programado' || s === 'publicado' || s === 'fallido' || s === 'generado') {
    return s
  }
  return 'generado'
}

/** @deprecated Prefer getInstagramTokenHealth(); mantiene compat con callers sync de env. */
export function isInstagramTokenExpiringSoon(daysThreshold = 15): boolean {
  const raw = process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT
  if (!raw) return false
  const exp = new Date(raw)
  if (Number.isNaN(exp.getTime())) return false
  const msLeft = exp.getTime() - Date.now()
  return msLeft > 0 && msLeft < daysThreshold * 24 * 60 * 60 * 1000
}

export function isInstagramTokenExpiredFromEnv(): boolean {
  const raw = process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT
  if (!raw) return false
  const exp = new Date(raw)
  if (Number.isNaN(exp.getTime())) return false
  return exp.getTime() <= Date.now()
}

export async function getInstagramTokenHealth(daysThreshold = 15) {
  return getInstagramTokenStatus(daysThreshold)
}
