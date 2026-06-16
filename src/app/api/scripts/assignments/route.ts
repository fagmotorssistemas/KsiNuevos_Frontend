import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const fecha = request.nextUrl.searchParams.get('fecha')
  const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
  const upstream = await proxyAutomationScripts(`/scripts/assignments${qs}`)
  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
