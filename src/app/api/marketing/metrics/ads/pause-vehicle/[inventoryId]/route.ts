import { NextRequest, NextResponse } from 'next/server'

import { proxyMetricsInternal } from '@/lib/metrics/internal-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { inventoryId } = await params
  if (!inventoryId?.trim()) {
    return NextResponse.json({ ok: false, message: 'inventory_id requerido' }, { status: 400 })
  }

  const proxied = await proxyMetricsInternal(
    `/internal/metrics/ads/pause-vehicle/${encodeURIComponent(inventoryId.trim())}`,
    { method: 'POST' }
  )
  if (!proxied.ok) return proxied.response

  return NextResponse.json({ ok: true, data: proxied.data })
}
