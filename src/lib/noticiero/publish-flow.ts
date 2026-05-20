import type { NoticieroJob } from './types'

export function resolveNoticieroSocialStage(job: NoticieroJob): string {
  const ready = job.status === 'completed' || Boolean(job.final_video_url?.trim())
  if (!ready) return ''
  const s = job.social_publish_stage
  if (
    s === 'aprobado' ||
    s === 'programado' ||
    s === 'publicado' ||
    s === 'fallido' ||
    s === 'generado'
  ) {
    return s
  }
  return 'generado'
}

export function canApproveNoticieroForPublish(job: NoticieroJob): boolean {
  return resolveNoticieroSocialStage(job) === 'generado'
}
