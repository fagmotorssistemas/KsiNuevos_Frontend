import { NextResponse } from 'next/server'

import { proxyMetricsInternal } from '@/lib/metrics/internal-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export async function POST(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const proxied = await proxyMetricsInternal('/internal/metrics/campaigns/refresh', {
    method: 'POST',
  })
  if (!proxied.ok) return proxied.response

  return NextResponse.json({ ok: true, data: proxied.data })
}
