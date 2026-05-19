import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createNoticieroJob } from '@/lib/noticiero/jobs'
import { buildVehicleHeadlineSync, isBannerTitleValid, normalizeBannerTitle } from '@/lib/noticiero/banner-title'
import type { NoticieroMode, NoticieroVehicle } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'

function defaultJobName(mode: NoticieroMode, vehicle?: NoticieroVehicle, customTopic?: string): string {
  if (mode === 'vehicle' && vehicle) {
    return `Noticiero · ${vehicle.brand} ${vehicle.model}`.slice(0, 100)
  }
  const t = customTopic?.trim() ?? 'Tema personalizado'
  return `Noticiero · ${t.slice(0, 80)}`
}

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
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      mode?: NoticieroMode
      vehicle?: NoticieroVehicle
      customTopic?: string
      bannerTitle?: string
    }

    if (body.mode !== 'vehicle' && body.mode !== 'custom') {
      return NextResponse.json({ error: 'mode inválido' }, { status: 400 })
    }

    let vehicle: NoticieroVehicle | null = null
    if (body.mode === 'vehicle') {
      vehicle = parseVehicle(body.vehicle ?? {})
      if (!vehicle) {
        return NextResponse.json({ error: 'vehicle requerido' }, { status: 400 })
      }
    } else if (!body.customTopic?.trim()) {
      return NextResponse.json({ error: 'customTopic requerido' }, { status: 400 })
    }

    const fromClient = body.bannerTitle?.trim() ? normalizeBannerTitle(body.bannerTitle) : ''
    const bannerTitle =
      isBannerTitleValid(fromClient)
        ? fromClient
        : body.mode === 'vehicle' && vehicle
          ? buildVehicleHeadlineSync(vehicle)
          : null

    const jobId = await createNoticieroJob({
      jobName: defaultJobName(body.mode, vehicle ?? undefined, body.customTopic),
      mode: body.mode,
      vehicle,
      customTopic: body.customTopic?.trim(),
      bannerTitle: bannerTitle ?? undefined,
      createdBy: auth.userId,
    })

    return NextResponse.json({ jobId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creando job'
    console.error('[noticiero/jobs/create]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
