import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { isPilarSistema } from '@/types/pilar'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sistema: string; id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { sistema, id } = await params
  if (!isPilarSistema(sistema)) {
    return NextResponse.json({ message: 'sistema inválido' }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  const upstream = await proxyAutomationScripts(`/pilares/${sistema}/${id}/facebook-post`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
