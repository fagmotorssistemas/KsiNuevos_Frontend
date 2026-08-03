import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createRawFullVideoFolder } from '@/lib/videos/raw-full-videos-library'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      inventory_vehicle_id?: string | null
      inventory_vehicle_id_2?: string | null
      formato?: string | null
      title?: string | null
      caption?: string | null
      files?: Array<{ filename: string; mimeType?: string }>
    }
    const result = await createRawFullVideoFolder({
      inventoryVehicleId: body.inventory_vehicle_id ?? null,
      inventoryVehicleId2: body.inventory_vehicle_id_2 ?? null,
      formato: body.formato ?? null,
      title: body.title ?? null,
      caption: body.caption ?? null,
      files: (body.files ?? []).map((f) => ({ filename: f.filename ?? '' })),
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/create]', message)
    const status =
      message.includes('Selecciona') ||
      message.includes('duelo') ||
      message.includes('formato') ||
      message.startsWith('Máximo')
        ? 400
        : message.includes('no encontrado')
          ? 404
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
