import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getFacebookPublishDiagnostics } from '@/lib/videos/facebook'
import { isInstagramTokenExpiringSoon } from '@/lib/videos/publish-flow'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const facebook = await getFacebookPublishDiagnostics().catch((e) => {
    console.error('[publish/health] facebook diagnostics', e)
    return null
  })

  return NextResponse.json({
    instagramTokenExpiringSoon: isInstagramTokenExpiringSoon(15),
    instagramTokenExpiresAt: process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT ?? null,
    facebook,
  })
}
