import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { ingestInstagramToken } from '@/lib/videos/instagram-token'

export const dynamic = 'force-dynamic'

/**
 * POST — pega un token nuevo de Meta (corto o largo).
 * Si hay INSTAGRAM_APP_SECRET / FACEBOOK_APP_SECRET, intenta canje a ~60 días
 * y lo guarda en app_runtime_secrets (prioridad sobre env).
 */
export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as { accessToken?: string }
    const accessToken = body.accessToken?.trim()
    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken requerido' }, { status: 400 })
    }

    const result = await ingestInstagramToken(accessToken)
    return NextResponse.json({
      ok: true,
      exchanged: result.exchanged,
      expiresAt: result.expiresAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error guardando token'
    console.error('[instagram/set-token]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
