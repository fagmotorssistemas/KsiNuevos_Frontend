import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getPublishingServiceClient } from '@/lib/videos/publishing-service'
import type { PublishingPlatform } from '@/lib/videos/types'

export const dynamic = 'force-dynamic'

function isPlatform(x: string): x is PublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { queueId } = await params

  try {
    const body = (await request.json()) as {
      caption?: string
      platforms?: string[]
      scheduledAt?: string
    }

    const supabase = getPublishingServiceClient()
    const { data: row, error: qErr } = await supabase
      .from('video_publishing_queue')
      .select('id, status')
      .eq('id', queueId)
      .single()

    if (qErr || !row) {
      return NextResponse.json({ error: 'Cola no encontrada' }, { status: 404 })
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se puede editar en estado pendiente' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.caption !== undefined) {
      const c = String(body.caption).trim()
      if (!c) return NextResponse.json({ error: 'caption vacío' }, { status: 400 })
      updates.caption = c
    }
    if (body.platforms !== undefined) {
      const platforms = body.platforms.filter(isPlatform)
      if (platforms.length === 0) {
        return NextResponse.json({ error: 'Selecciona al menos una red' }, { status: 400 })
      }
      updates.platforms = platforms
    }
    if (body.scheduledAt !== undefined) {
      const scheduled = new Date(body.scheduledAt)
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 30_000) {
        return NextResponse.json({ error: 'La fecha no puede estar en el pasado' }, { status: 400 })
      }
      updates.scheduled_at = scheduled.toISOString()
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('video_publishing_queue')
      .update(updates)
      .eq('id', queueId)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo actualizar' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[publish/queue PATCH]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { queueId } = await params
  const supabase = getPublishingServiceClient()

  const { data: row } = await supabase
    .from('video_publishing_queue')
    .select('id, status, video_id')
    .eq('id', queueId)
    .single()
  if (!row) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Solo se puede cancelar pendiente' }, { status: 400 })
  }

  const { error } = await supabase
    .from('video_publishing_queue')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', queueId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from('video_jobs_v2')
    .update({ social_publish_stage: 'aprobado', updated_at: new Date().toISOString() })
    .eq('id', row.video_id)

  return NextResponse.json({ ok: true })
}
