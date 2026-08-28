import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { assignInboxVideo } from '@/lib/videos/marketing-inbox-videos-library'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }
    const body = (await request.json()) as {
      formato?: string
      inventory_vehicle_id?: string | null
      inventory_vehicle_id_2?: string | null
      caption?: string | null
    }
    const result = await assignInboxVideo({
      id: id.trim(),
      formato: body.formato ?? '',
      inventoryVehicleId: body.inventory_vehicle_id ?? null,
      inventoryVehicleId2: body.inventory_vehicle_id_2 ?? null,
      caption: body.caption ?? null,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[videos/inbox assign]', message)
    const status =
      message.includes('Selecciona') ||
      message.includes('duelo') ||
      message.includes('formato') ||
      message.includes('vehículo') ||
      message.includes('vehiculos') ||
      message.startsWith('Máximo')
        ? 400
        : message.includes('no encontrado')
          ? 404
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
