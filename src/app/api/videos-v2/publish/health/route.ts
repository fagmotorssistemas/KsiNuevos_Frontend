import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos-v2/api-marketing-auth'
import { isInstagramTokenExpiringSoon } from '@/lib/videos-v2/publish-flow'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  return NextResponse.json({
    instagramTokenExpiringSoon: isInstagramTokenExpiringSoon(15),
    instagramTokenExpiresAt: process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT ?? null,
  })
}
