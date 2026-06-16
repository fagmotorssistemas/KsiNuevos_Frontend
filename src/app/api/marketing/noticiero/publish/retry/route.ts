import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { executeNoticieroPublishForQueueRow } from '@/lib/noticiero/publishing-service'
import type { NoticieroPublishingPlatform } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as { queue_id?: string; onlyPlatforms?: string[] }
    if (!body.queue_id) {
      return NextResponse.json({ error: 'queue_id requerido' }, { status: 400 })
    }

    const onlyPlatforms = body.onlyPlatforms?.filter(
      (p): p is NoticieroPublishingPlatform => p === 'instagram' || p === 'facebook'
    )

    const r = await executeNoticieroPublishForQueueRow(body.queue_id, {
      onlyPlatforms: onlyPlatforms?.length ? onlyPlatforms : undefined,
    })

    return NextResponse.json(r)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en reintento'
    console.error('[noticiero/publish/retry]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
