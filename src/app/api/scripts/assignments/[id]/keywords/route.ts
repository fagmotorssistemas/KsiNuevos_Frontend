import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { id } = await params
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  if (!body.submitted_by) {
    body.submitted_by = auth.userId
  }

  const upstream = await proxyAutomationScripts(`/scripts/assignments/${id}/keywords`, {
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
