import { NextResponse } from 'next/server'

import { proxyMetricsInternal } from '@/lib/metrics/internal-proxy'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export async function GET(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const proxied = await proxyMetricsInternal('/internal/metrics/alerts', { method: 'GET' })
  if (!proxied.ok) return proxied.response

  return NextResponse.json(
    { ok: true, data: proxied.data },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  )
}
