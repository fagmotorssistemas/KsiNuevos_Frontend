import type { VideoJobV2, VideoSocialPublishStage } from './types'

export function resolveSocialPublishStage(job: VideoJobV2): VideoSocialPublishStage | null {
  if (job.status !== 'completed') return null
  const s = job.social_publish_stage
  if (s === 'aprobado' || s === 'programado' || s === 'publicado' || s === 'fallido' || s === 'generado') {
    return s
  }
  return 'generado'
}

export function isInstagramTokenExpiringSoon(daysThreshold = 15): boolean {
  const raw = process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT
  if (!raw) return false
  const exp = new Date(raw)
  if (Number.isNaN(exp.getTime())) return false
  const msLeft = exp.getTime() - Date.now()
  return msLeft > 0 && msLeft < daysThreshold * 24 * 60 * 60 * 1000
}
