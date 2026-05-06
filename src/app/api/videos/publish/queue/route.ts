import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getPublishingServiceClient } from '@/lib/videos/publishing-service'
import type { PublishingPlatform } from '@/lib/videos/types'

export const dynamic = 'force-dynamic'

function isPlatform(x: string): x is PublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      videoId?: string
      vehicleId?: string | null
      caption?: string
      platforms?: string[]
      scheduledAt?: string
    }

    if (!body.videoId || !body.caption?.trim() || !body.scheduledAt) {
      return NextResponse.json(
        { error: 'videoId, caption y scheduledAt son requeridos' },
        { status: 400 }
      )
    }
    if (!body.vehicleId) {
      return NextResponse.json({ error: 'vehicleId es requerido' }, { status: 400 })
    }
    const platforms = (body.platforms ?? []).filter(isPlatform)
    if (platforms.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una red' }, { status: 400 })
    }

    const scheduled = new Date(body.scheduledAt)
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 30_000) {
      return NextResponse.json({ error: 'La fecha de publicación no puede estar en el pasado' }, { status: 400 })
    }

    const supabase = getPublishingServiceClient()

    const { data: job, error: jobErr } = await supabase
      .from('video_jobs_v2')
      .select('id, status, final_video_url')
      .eq('id', body.videoId)
      .single()
    if (jobErr || !job || job.status !== 'completed' || !job.final_video_url) {
      return NextResponse.json({ error: 'Video no encontrado o aún no está listo' }, { status: 400 })
    }

    const { data: inserted, error: insErr } = await supabase
      .from('video_publishing_queue')
      .insert({
        video_id: body.videoId,
        vehicle_id: body.vehicleId,
        caption: body.caption.trim(),
        scheduled_at: scheduled.toISOString(),
        platforms,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      console.error('[publish/queue] insert', insErr)
      return NextResponse.json({ error: insErr?.message ?? 'No se pudo programar' }, { status: 500 })
    }

    await supabase
      .from('video_jobs_v2')
      .update({ social_publish_stage: 'programado', updated_at: new Date().toISOString() })
      .eq('id', body.videoId)

    return NextResponse.json(inserted)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[publish/queue]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
