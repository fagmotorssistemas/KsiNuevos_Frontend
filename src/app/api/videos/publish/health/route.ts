import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getFacebookPublishDiagnostics } from '@/lib/videos/facebook'
import { getInstagramTokenHealth } from '@/lib/videos/publish-flow'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const facebook = await getFacebookPublishDiagnostics().catch((e) => {
    console.error('[publish/health] facebook diagnostics', e)
    return null
  })

  const ig = await getInstagramTokenHealth(15).catch((e) => {
    console.error('[publish/health] instagram token', e)
    return null
  })

  return NextResponse.json({
    instagramTokenExpiringSoon: ig?.expiringSoon ?? false,
    instagramTokenExpired: ig?.expired ?? false,
    instagramTokenExpiresAt: ig?.expiresAt ?? null,
    instagramTokenHasToken: ig?.hasToken ?? false,
    instagramTokenSource: ig?.source ?? 'missing',
    facebook,
  })
}
