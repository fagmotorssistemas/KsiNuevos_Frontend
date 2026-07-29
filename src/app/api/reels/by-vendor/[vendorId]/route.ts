import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { vendorId } = await params
  const formato = request.nextUrl.searchParams.get('formato')
  const fechaDesde = request.nextUrl.searchParams.get('fecha_desde')
  const fechaHasta = request.nextUrl.searchParams.get('fecha_hasta')
  const qsParams = new URLSearchParams()
  if (formato) qsParams.set('formato', formato)
  if (fechaDesde) qsParams.set('fecha_desde', fechaDesde)
  if (fechaHasta) qsParams.set('fecha_hasta', fechaHasta)
  const qs = qsParams.toString() ? `?${qsParams.toString()}` : ''

  const upstream = await proxyAutomationScripts(`/reels/by-vendor/${vendorId}${qs}`)
  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
