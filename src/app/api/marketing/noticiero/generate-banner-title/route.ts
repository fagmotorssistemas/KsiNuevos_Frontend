import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { requireNoticieroEnv } from '@/lib/noticiero/env'
import { buildVehicleHeadlineSync, isBannerTitleValid, normalizeBannerTitle } from '@/lib/noticiero/banner-title'
import { generateCustomBannerTitle, generateVehicleHeadline } from '@/lib/noticiero/gemini'
import type { GenerateBannerTitleRequest, NoticieroVehicle } from '@/lib/noticiero/types'

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
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    requireNoticieroEnv()
    const body = (await request.json()) as GenerateBannerTitleRequest

    if (body.mode === 'vehicle') {
      const vehicle = parseVehicle(body.vehicle ?? {})
      if (!vehicle) {
        return NextResponse.json({ error: 'Vehículo inválido o incompleto' }, { status: 400 })
      }

      const useAi = body.useAi !== false
      const bannerTitle = useAi
        ? await generateVehicleHeadline(vehicle)
        : buildVehicleHeadlineSync(vehicle)

      return NextResponse.json({ bannerTitle, source: useAi ? 'ai' : 'sync' })
    }

    if (body.mode === 'custom') {
      const topic = body.customTopic?.trim()
      if (!topic) {
        return NextResponse.json({ error: 'El tema personalizado es requerido' }, { status: 400 })
      }
      const bannerTitle = await generateCustomBannerTitle(topic)
      return NextResponse.json({ bannerTitle, source: 'ai' })
    }

    if (body.mode === 'manual') {
      const title = normalizeBannerTitle(body.bannerTitle ?? '')
      if (!isBannerTitleValid(title)) {
        return NextResponse.json({ error: 'Titular inválido (mín. 3 caracteres)' }, { status: 400 })
      }
      return NextResponse.json({ bannerTitle: title, source: 'manual' })
    }

    return NextResponse.json({ error: 'mode debe ser vehicle, custom o manual' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando titular'
    console.error('[noticiero/generate-banner-title]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
