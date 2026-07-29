import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronOrMarketing } from '@/lib/videos/api-marketing-auth'
import { maybeRefreshInstagramTokenForCron, refreshInstagramLongLivedToken } from '@/lib/videos/instagram-token'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET/POST — refresca el long-lived de Instagram (~60 días) si aún es válido.
 * Cron semanal + botón manual en UI de publicación.
 *
 * Query `force=1` (solo sesión marketing) fuerza el refresh aunque queden >20 días.
 */
async function handle(request: NextRequest) {
  const auth = await authorizeCronOrMarketing(request)
  if (!auth.ok) return auth.response

  const force = new URL(request.url).searchParams.get('force') === '1'

  try {
    if (force && auth.via === 'session') {
      const r = await refreshInstagramLongLivedToken()
      return NextResponse.json({
        action: 'refreshed',
        expiresAt: r.expiresAt,
        expiresIn: r.expiresIn,
      })
    }

    const result = await maybeRefreshInstagramTokenForCron()
    const status =
      result.action === 'needs_reauth' || result.action === 'missing' ? 409 : 200
    return NextResponse.json(result, { status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error refrescando token'
    console.error('[instagram/refresh-token]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
