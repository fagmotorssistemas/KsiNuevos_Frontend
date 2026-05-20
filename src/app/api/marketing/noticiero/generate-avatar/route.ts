import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { requireNoticieroEnv } from '@/lib/noticiero/env'
import { isAllowedNoticieroBackgroundUrl } from '@/lib/noticiero/backgrounds-storage'
import { startHeyGenGeneration, pollHeyGenVideo } from '@/lib/noticiero/heygen'
import { updateNoticieroJob } from '@/lib/noticiero/jobs'
import type { GenerateAvatarRequest } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const body = (await request.json()) as GenerateAvatarRequest & {
    jobId?: string
    heygenVideoId?: string
  }

  try {
    requireNoticieroEnv()

    const script = body.script?.trim()
    const resumeId = body.heygenVideoId?.trim()
    const backgroundUrl = body.backgroundUrl?.trim() || null

    if (!script && !resumeId) {
      return NextResponse.json({ error: 'script o heygenVideoId es requerido' }, { status: 400 })
    }

    if (backgroundUrl && !isAllowedNoticieroBackgroundUrl(backgroundUrl)) {
      return NextResponse.json({ error: 'URL de fondo no permitida' }, { status: 400 })
    }

    let videoId = resumeId

    if (!videoId) {
      console.log(
        '[noticiero/generate-avatar] Nuevo video HeyGen (puede tardar 2-5 min), fondo=',
        backgroundUrl ? 'imagen' : 'blanco'
      )
      videoId = await startHeyGenGeneration(script!, backgroundUrl)
      if (body.jobId) {
        await updateNoticieroJob(body.jobId, {
          heygen_video_id: videoId,
          status: 'avatar',
          current_step: 'avatar',
          progress_percentage: 45,
          error_message: null,
        })
      }
    } else {
      console.log('[noticiero/generate-avatar] Reanudar polling', videoId)
    }

    const videoUrl = await pollHeyGenVideo(videoId)

    if (body.jobId) {
      await updateNoticieroJob(body.jobId, {
        heygen_video_id: videoId,
        heygen_video_url: videoUrl,
        status: 'compositing',
        current_step: 'video',
        progress_percentage: 70,
        error_message: null,
      })
    }

    return NextResponse.json({ videoId, videoUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando avatar con HeyGen'
    console.error('[noticiero/generate-avatar]', err)

    if (body.jobId && message.includes('tiempo de espera agotado')) {
      return NextResponse.json(
        {
          error: message,
          heygenVideoId: body.heygenVideoId ?? undefined,
          canResume: true,
        },
        { status: 504 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
