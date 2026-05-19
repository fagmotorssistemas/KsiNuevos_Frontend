import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getNoticieroPublishingClient } from '@/lib/noticiero/publishing-service'
import type { NoticieroPublishingPlatform } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'

function isPlatform(x: string): x is NoticieroPublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      noticieroJobId?: string
      vehicleId?: string | null
      caption?: string
      platforms?: string[]
      scheduledAt?: string
    }

    if (!body.noticieroJobId || !body.caption?.trim() || !body.scheduledAt) {
      return NextResponse.json(
        { error: 'noticieroJobId, caption y scheduledAt son requeridos' },
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

    const supabase = getNoticieroPublishingClient()

    const { data: job, error: jobErr } = await supabase
      .from('noticiero_jobs')
      .select('id, status, final_video_url, social_publish_stage')
      .eq('id', body.noticieroJobId)
      .single()

    if (jobErr || !job || job.status !== 'completed' || !job.final_video_url) {
      return NextResponse.json({ error: 'Noticiero no encontrado o aún no está listo' }, { status: 400 })
    }

    const { data: inserted, error: insErr } = await supabase
      .from('noticiero_publishing_queue')
      .insert({
        noticiero_job_id: body.noticieroJobId,
        vehicle_id: body.vehicleId,
        caption: body.caption.trim(),
        scheduled_at: scheduled.toISOString(),
        platforms,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      console.error('[noticiero/publish/queue] insert', insErr)
      return NextResponse.json({ error: insErr?.message ?? 'No se pudo programar' }, { status: 500 })
    }

    await supabase
      .from('noticiero_jobs')
      .update({ social_publish_stage: 'programado', updated_at: new Date().toISOString() })
      .eq('id', body.noticieroJobId)

    return NextResponse.json(inserted)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[noticiero/publish/queue]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
