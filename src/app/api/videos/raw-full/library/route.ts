import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { fetchRawFullVideoLibrary } from '@/lib/videos/raw-full-videos-library'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(request.url)
    const data = await fetchRawFullVideoLibrary({
      q: url.searchParams.get('q') ?? undefined,
      inventoryVehicleId: url.searchParams.get('inventoryVehicleId') ?? undefined,
      page: Number(url.searchParams.get('page') ?? '1') || 1,
      pageSize: Number(url.searchParams.get('pageSize') ?? '24') || 24,
    })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
