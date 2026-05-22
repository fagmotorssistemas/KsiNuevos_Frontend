import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  executePublishForQueueRow,
  getPublishingServiceClient,
} from '@/lib/videos/publishing-service'
import type { PublishingPlatform } from '@/lib/videos/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function parsePlatforms(raw: unknown): PublishingPlatform[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is PublishingPlatform => p === 'instagram' || p === 'facebook')
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as { queue_id?: string; platforms?: unknown }
    if (!body.queue_id) {
      return NextResponse.json({ error: 'queue_id es requerido' }, { status: 400 })
    }

    const platforms = parsePlatforms(body.platforms)
    if (platforms.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una red (instagram o facebook)' }, { status: 400 })
    }

    const supabase = getPublishingServiceClient()
    const { data: row, error } = await supabase
      .from('video_publishing_queue')
      .select('id, status, platforms')
      .eq('id', body.queue_id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Cola no encontrada' }, { status: 404 })
    }
    if (row.status !== 'published' && row.status !== 'failed') {
      return NextResponse.json(
        { error: 'Solo se puede republicar una cola publicada o fallida' },
        { status: 400 }
      )
    }

    const allowed = (row.platforms ?? []).filter(
      (p): p is PublishingPlatform => p === 'instagram' || p === 'facebook'
    )
    const invalid = platforms.filter((p) => !allowed.includes(p))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Red no programada en esta cola: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await executePublishForQueueRow(body.queue_id, {
      republish: true,
      onlyPlatforms: platforms,
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en republicación'
    console.error('[publish/republish]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
