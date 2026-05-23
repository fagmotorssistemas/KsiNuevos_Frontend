import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { requireNoticieroEnv } from '@/lib/noticiero/env'
import { generateNoticieroScript } from '@/lib/noticiero/gemini'
import type { GenerateScriptRequest, NoticieroVehicle } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function parseVehicle(body: Partial<NoticieroVehicle>): NoticieroVehicle | null {
  if (!body?.id || !body.brand || !body.model) return null
  return {
    id: String(body.id),
    brand: String(body.brand),
    model: String(body.model),
    year: body.year ?? null,
    color: String(body.color ?? ''),
    version: String(body.version ?? ''),
    price: body.price ?? null,
    transmission: String(body.transmission ?? ''),
    fuel_type: String(body.fuel_type ?? ''),
    engine_displacement: String(body.engine_displacement ?? ''),
    drive_type: String(body.drive_type ?? ''),
    passenger_capacity: body.passenger_capacity ?? null,
    type_body: String(body.type_body ?? ''),
    horse_power: body.horse_power ?? null,
    mileage: body.mileage ?? null,
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    requireNoticieroEnv()
    const body = (await request.json()) as GenerateScriptRequest

    if (body.mode === 'vehicle') {
      const vehicle = parseVehicle(body.vehicle ?? {})
      if (!vehicle) {
        return NextResponse.json({ error: 'Vehículo inválido o incompleto' }, { status: 400 })
      }
      const result = await generateNoticieroScript(
        'vehicle',
        vehicle,
        undefined,
        body.bannerTitle
      )
      return NextResponse.json(result)
    }

    if (body.mode === 'custom') {
      const topic = body.customTopic?.trim()
      if (!topic) {
        return NextResponse.json({ error: 'El tema personalizado es requerido' }, { status: 400 })
      }
      const result = await generateNoticieroScript('custom', undefined, topic, body.bannerTitle)
      return NextResponse.json(result)
    }

    if (body.mode === 'creative_auto') {
      const result = await generateNoticieroScript('creative_auto')
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'mode debe ser "vehicle", "custom" o "creative_auto"' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando guión'
    console.error('[noticiero/generate-script]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
