import { NextResponse } from 'next/server'

import { proxyMetricsInternal } from '@/lib/metrics/internal-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

type RouteContext = { params: Promise<{ inventoryId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { inventoryId } = await context.params
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
