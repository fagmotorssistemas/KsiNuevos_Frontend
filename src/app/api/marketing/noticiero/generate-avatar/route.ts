import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { requireNoticieroEnv } from '@/lib/noticiero/env'
import { generateHeyGenAvatar } from '@/lib/noticiero/heygen'
import type { GenerateAvatarRequest } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    requireNoticieroEnv()
    const body = (await request.json()) as GenerateAvatarRequest
    const script = body.script?.trim()
    if (!script) {
      return NextResponse.json({ error: 'script es requerido' }, { status: 400 })
    }

    console.log('[noticiero/generate-avatar] Iniciando HeyGen (puede tardar 1-3 min)')
    const result = await generateHeyGenAvatar(script)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando avatar con HeyGen'
    console.error('[noticiero/generate-avatar]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
