import { NextResponse } from 'next/server'

import { proxyMetricsInternal } from '@/lib/metrics/internal-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export async function POST() {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const proxied = await proxyMetricsInternal('/internal/metrics/campaigns/refresh', {
    method: 'POST',
  })
  if (!proxied.ok) return proxied.response

  return NextResponse.json({ ok: true, data: proxied.data })
}
