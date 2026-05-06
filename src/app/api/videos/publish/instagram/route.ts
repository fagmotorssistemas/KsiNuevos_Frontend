import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { publishInstagramReel } from '@/lib/videos/instagram'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as { videoUrl?: string; caption?: string }
    if (!body.videoUrl?.trim() || !body.caption?.trim()) {
      return NextResponse.json({ error: 'videoUrl y caption son requeridos' }, { status: 400 })
    }
    const r = await publishInstagramReel(body.videoUrl.trim(), body.caption.trim())
    return NextResponse.json(r)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error Instagram'
    console.error('[publish/instagram]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
