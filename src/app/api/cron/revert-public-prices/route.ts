import { NextRequest, NextResponse } from 'next/server'
import { revertExpiredPublicPrices } from '@/lib/inventario/inventory-pricing-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization') ?? ''
  const isCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isCron) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await revertExpiredPublicPrices()
    console.log('[cron/revert-public-prices]', JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[cron/revert-public-prices]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
