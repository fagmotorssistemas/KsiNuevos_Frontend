import { isBannerTitleValid, normalizeBannerTitle } from './banner-title'
import { renderNoticieroTemplate } from './creatomate-template'
import { generateCustomBannerTitle, generateNoticieroScript, generateVehicleHeadline } from './gemini'
import { isHeyGenTimeoutError, pollHeyGenVideo, startHeyGenGeneration, tryGetHeyGenVideoUrl } from './heygen'
import { getNoticieroJob, updateNoticieroJob } from './jobs'
import type { NoticieroJob, NoticieroVehicle } from './types'

const activeRuns = new Map<string, Promise<void>>()

function isHeyGenTimeoutMessage(message: string): boolean {
  return isHeyGenTimeoutError(message)
}

async function resolveBannerTitle(job: NoticieroJob): Promise<string> {
  const existing = job.banner_title?.trim() ? normalizeBannerTitle(job.banner_title) : ''
  if (isBannerTitleValid(existing)) return existing

  if (job.mode === 'vehicle' && job.vehicle_snapshot) {
    return generateVehicleHeadline(job.vehicle_snapshot as NoticieroVehicle)
  }
  if (job.mode === 'custom' && job.custom_topic?.trim()) {
    return generateCustomBannerTitle(job.custom_topic)
  }
  throw new Error('No se pudo determinar el titular del banner')
}

async function runScriptStep(job: NoticieroJob): Promise<NoticieroJob> {
  if (job.script_text?.trim()) return job

  await updateNoticieroJob(job.id, {
    status: 'script',
    current_step: 'script',
    progress_percentage: 15,
    error_message: null,
  })

  const bannerOverride =
    job.banner_title?.trim() && isBannerTitleValid(job.banner_title)
      ? normalizeBannerTitle(job.banner_title)
      : undefined

  const { script, bannerTitle } = await generateNoticieroScript(
    job.mode,
    job.vehicle_snapshot as NoticieroVehicle | undefined,
    job.custom_topic ?? undefined,
    bannerOverride
  )

  await updateNoticieroJob(job.id, {
    status: 'avatar',
    current_step: 'avatar',
    progress_percentage: 40,
    script_text: script,
    banner_title: bannerTitle,
    job_name: `Noticiero · ${bannerTitle}`.slice(0, 100),
    error_message: null,
  })

  const updated = await getNoticieroJob(job.id)
  if (!updated?.script_text) throw new Error('No se guardó el guión del noticiero')
  return updated
}

async function runAvatarStep(job: NoticieroJob): Promise<NoticieroJob> {
  if (job.heygen_video_url?.trim()) return job

  const script = job.script_text?.trim()
  if (!script) throw new Error('Falta el guión para generar el avatar')

  let videoId = job.heygen_video_id?.trim() ?? ''

  if (!videoId) {
    await updateNoticieroJob(job.id, {
      status: 'avatar',
      current_step: 'avatar',
      progress_percentage: 45,
      error_message: null,
    })

    videoId = await startHeyGenGeneration(script, job.heygen_background_url ?? null, {
      avatarId: job.heygen_avatar_id,
      voiceId: job.heygen_voice_id,
    })
    await updateNoticieroJob(job.id, {
      heygen_video_id: videoId,
      status: 'avatar',
      current_step: 'avatar',
      progress_percentage: 50,
    })
  }

  let videoUrl: string
  try {
    videoUrl = await pollHeyGenVideo(videoId)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isHeyGenTimeoutMessage(message)) {
      const recovered = await tryGetHeyGenVideoUrl(videoId)
      if (recovered) {
        console.log('[noticiero/pipeline] HeyGen URL recuperada tras timeout')
        videoUrl = recovered
      } else {
        throw err
      }
    } else {
      throw err
    }
  }

  await updateNoticieroJob(job.id, {
    heygen_video_id: videoId,
    heygen_video_url: videoUrl,
    status: 'compositing',
    current_step: 'video',
    progress_percentage: 70,
    error_message: null,
  })

  const updated = await getNoticieroJob(job.id)
  if (!updated?.heygen_video_url) throw new Error('HeyGen no guardó la URL del avatar')
  return updated
}

async function runVideoStep(job: NoticieroJob): Promise<NoticieroJob> {
  if (job.final_video_url?.trim()) return job

  const heygenVideoUrl = job.heygen_video_url?.trim()
  if (!heygenVideoUrl) throw new Error('Falta el video de HeyGen para componer')

  const bannerTitle = await resolveBannerTitle(job)

  await updateNoticieroJob(job.id, {
    status: 'compositing',
    current_step: 'video',
    progress_percentage: 75,
    banner_title: bannerTitle,
    error_message: null,
  })

  const { renderId, videoUrl } = await renderNoticieroTemplate(heygenVideoUrl, bannerTitle)

  await updateNoticieroJob(job.id, {
    status: 'completed',
    current_step: 'done',
    progress_percentage: 100,
    final_video_url: videoUrl,
    creatomate_render_id: renderId,
    banner_title: bannerTitle,
    social_publish_stage: 'generado',
    error_message: null,
  })

  const updated = await getNoticieroJob(job.id)
  if (!updated?.final_video_url) throw new Error('Creatomate no guardó el video final')
  return updated
}

/** Ejecuta el pipeline completo en el servidor (idempotente por pasos). */
export async function runNoticieroPipeline(jobId: string): Promise<void> {
  console.log('[noticiero/pipeline] Inicio job=', jobId)

  let job = await getNoticieroJob(jobId)
  if (!job) {
    console.error('[noticiero/pipeline] Job no encontrado', jobId)
    return
  }

  if (job.status === 'completed' && job.final_video_url) {
    console.log('[noticiero/pipeline] Ya completado', jobId)
    return
  }

  try {
    if (!job.script_text?.trim()) {
      job = await runScriptStep(job)
    }

    if (!job.heygen_video_url?.trim()) {
      job = await runAvatarStep(job)
    }

    if (!job.final_video_url?.trim()) {
      job = await runVideoStep(job)
    }

    console.log('[noticiero/pipeline] Completado job=', jobId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en el pipeline del noticiero'
    console.error('[noticiero/pipeline] Error job=', jobId, err)

    const latest = await getNoticieroJob(jobId)
    const keepAvatarForResume =
      isHeyGenTimeoutMessage(message) && Boolean(latest?.heygen_video_id)

    if (keepAvatarForResume && latest?.heygen_video_id) {
      const recovered = await tryGetHeyGenVideoUrl(latest.heygen_video_id)
      if (recovered) {
        console.log('[noticiero/pipeline] Recuperación automática HeyGen tras timeout')
        await updateNoticieroJob(jobId, {
          heygen_video_url: recovered,
          heygen_video_id: latest.heygen_video_id,
          status: 'compositing',
          current_step: 'video',
          progress_percentage: 70,
          error_message: null,
        })
        let resumed = await getNoticieroJob(jobId)
        if (resumed && !resumed.final_video_url?.trim()) {
          resumed = await runVideoStep(resumed)
        }
        console.log('[noticiero/pipeline] Completado tras recuperación HeyGen job=', jobId)
        return
      }
    }

    await updateNoticieroJob(jobId, {
      status: keepAvatarForResume ? 'avatar' : 'failed',
      error_message: keepAvatarForResume
        ? 'HeyGen sigue procesando el avatar. El pipeline reintentará automáticamente.'
        : message,
      progress_percentage: keepAvatarForResume ? 50 : latest?.progress_percentage ?? 0,
    })

    if (keepAvatarForResume) {
      setTimeout(() => scheduleNoticieroPipeline(jobId), 15_000)
    }
  }
}

/** Evita ejecuciones duplicadas del mismo job en el mismo proceso Node. */
export function scheduleNoticieroPipeline(jobId: string): void {
  if (activeRuns.has(jobId)) {
    console.log('[noticiero/pipeline] Ya en ejecución', jobId)
    return
  }

  const run = runNoticieroPipeline(jobId).finally(() => {
    activeRuns.delete(jobId)
  })
  activeRuns.set(jobId, run)
}

export function jobStatusToPipelineStep(
  job: Pick<NoticieroJob, 'status' | 'script_text' | 'heygen_video_url' | 'final_video_url'>
): 'idle' | 'script' | 'avatar' | 'video' | 'done' | 'error' {
  if (job.final_video_url?.trim()) return 'done'
  if (job.status === 'completed') return 'done'
  if (job.status === 'failed') return 'error'
  if (job.status === 'compositing' || job.heygen_video_url) return 'video'
  if (job.status === 'avatar' || job.script_text) return 'avatar'
  if (job.status === 'script' || job.status === 'pending') return 'script'
  return 'script'
}

export const NOTICIERO_ACTIVE_JOB_STORAGE_KEY = 'noticiero_active_job_id'
