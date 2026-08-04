import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const fecha = request.nextUrl.searchParams.get('fecha')
  const sistema = request.nextUrl.searchParams.get('sistema')
  const params = new URLSearchParams()
  if (fecha) params.set('fecha', fecha)
  if (sistema) params.set('sistema', sistema)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const upstream = await proxyAutomationScripts(`/pilares/scripts${qs}`)
  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
