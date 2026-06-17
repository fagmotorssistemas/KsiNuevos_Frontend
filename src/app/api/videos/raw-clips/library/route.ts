import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { fetchRawClipsLibrary } from '@/lib/videos/raw-clips-library'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const page = Number(url.searchParams.get('page') ?? '1') || 1
    const pageSize = Number(url.searchParams.get('pageSize') ?? '24') || 24

    const data = await fetchRawClipsLibrary({ q, status, page, pageSize })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-clips/library]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
