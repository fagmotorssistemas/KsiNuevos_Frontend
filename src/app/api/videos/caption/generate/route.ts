import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { generateCaption, type VehicleCaptionInput } from '@/lib/videos/caption'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as Partial<VehicleCaptionInput>
    const vehicle: VehicleCaptionInput = {
      marca: String(body.marca ?? '').trim() || '(sin marca)',
      modelo: String(body.modelo ?? '').trim() || '(sin modelo)',
      version: String(body.version ?? '').trim() || '(sin versión)',
      año: body.año ?? '',
      motor: String(body.motor ?? '').trim() || '(no indicado)',
      transmision: String(body.transmision ?? '').trim() || '(no indicada)',
      traccion: String(body.traccion ?? '').trim() || '(no indicada)',
      tipo: String(body.tipo ?? '').trim() || '(no indicado)',
    }
    const caption = await generateCaption(vehicle)
    return NextResponse.json({ caption })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando caption'
    console.error('[caption/generate]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
