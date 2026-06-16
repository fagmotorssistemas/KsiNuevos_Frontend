import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  executePublishForQueueRow,
  getPublishingServiceClient,
} from '@/lib/videos/publishing-service'
import type { PublishingPlatform } from '@/lib/videos/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as { queue_id?: string }
    if (!body.queue_id) {
      return NextResponse.json({ error: 'queue_id es requerido' }, { status: 400 })
    }

    const supabase = getPublishingServiceClient()
    const { data: row, error } = await supabase
      .from('video_publishing_queue')
      .select('id, status')
      .eq('id', body.queue_id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Cola no encontrada' }, { status: 404 })
    }
    if (row.status !== 'failed') {
      return NextResponse.json({ error: 'Solo se puede reintentar una cola fallida' }, { status: 400 })
    }

    const { data: failedRows } = await supabase
      .from('video_publishing_results')
      .select('platform')
      .eq('queue_id', body.queue_id)
      .eq('status', 'failed')

    const onlyPlatforms = (failedRows ?? [])
      .map((r) => r.platform)
      .filter((p): p is PublishingPlatform => p === 'instagram' || p === 'facebook')

    if (onlyPlatforms.length === 0) {
      return NextResponse.json({ error: 'No hay plataformas fallidas registradas' }, { status: 400 })
    }

    const result = await executePublishForQueueRow(body.queue_id, { onlyPlatforms })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en reintento'
    console.error('[publish/retry]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
