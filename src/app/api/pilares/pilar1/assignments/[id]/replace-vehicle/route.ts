import { NextRequest, NextResponse } from 'next/server'
import { proxyAutomationScripts } from '@/lib/automation-api-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** POST /api/pilares/pilar1/assignments/:id/replace-vehicle → /pilar1/assignments/:id/replace-vehicle */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  let body: Record<string, unknown> = {}
  try {
    const raw = await request.text()
    if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  const upstream = await proxyAutomationScripts(`/pilar1/assignments/${id}/replace-vehicle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
