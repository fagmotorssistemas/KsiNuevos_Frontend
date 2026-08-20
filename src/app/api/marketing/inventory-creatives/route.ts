import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { fetchVehicleCreatives } from '@/lib/marketing/inventory-vehicle-creatives'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const vehicleId = request.nextUrl.searchParams.get('vehicleId')?.trim() ?? ''
  if (!vehicleId) {
    return NextResponse.json({ error: 'Falta vehicleId' }, { status: 400 })
  }

  try {
    const creatives = await fetchVehicleCreatives(vehicleId)
    return NextResponse.json({ creatives })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[inventory-creatives]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
