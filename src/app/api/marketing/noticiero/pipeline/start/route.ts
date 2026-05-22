import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { isAllowedNoticieroBackgroundUrl } from '@/lib/noticiero/backgrounds-storage'
import { buildVehicleHeadlineSync, isBannerTitleValid, normalizeBannerTitle } from '@/lib/noticiero/banner-title'
import { createNoticieroJob, updateNoticieroJob } from '@/lib/noticiero/jobs'
import { scheduleNoticieroPipeline } from '@/lib/noticiero/pipeline'
import { resolveHeyGenAvatarAndVoice } from '@/lib/noticiero/resolve-avatar'
import type { NoticieroMode, NoticieroVehicle, StartPipelineRequest } from '@/lib/noticiero/types'

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
    const body = (await request.json()) as StartPipelineRequest

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

    const backgroundUrl = body.backgroundUrl?.trim() || null
    if (backgroundUrl && !isAllowedNoticieroBackgroundUrl(backgroundUrl)) {
      return NextResponse.json({ error: 'URL de fondo no permitida' }, { status: 400 })
    }

    const fromClient = body.bannerTitle?.trim() ? normalizeBannerTitle(body.bannerTitle) : ''
    const bannerTitle =
      isBannerTitleValid(fromClient)
        ? fromClient
        : body.mode === 'vehicle' && vehicle
          ? buildVehicleHeadlineSync(vehicle)
          : null

    const { avatarId, voiceId } = resolveHeyGenAvatarAndVoice(body.avatarId, body.voiceId)

    const jobId = await createNoticieroJob({
      jobName: defaultJobName(body.mode, vehicle ?? undefined, body.customTopic),
      mode: body.mode,
      vehicle,
      customTopic: body.customTopic?.trim(),
      bannerTitle: bannerTitle ?? undefined,
      heygenBackgroundUrl: backgroundUrl,
      heygenAvatarId: avatarId,
      heygenVoiceId: voiceId,
      createdBy: auth.userId,
    })

    await updateNoticieroJob(jobId, {
      status: 'pending',
      current_step: 'script',
      progress_percentage: 5,
      error_message: null,
    })

    after(() => {
      scheduleNoticieroPipeline(jobId)
    })

    return NextResponse.json({
      jobId,
      message:
        'Pipeline iniciado en el servidor. Puedes recargar la página; el progreso continuará en segundo plano.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error iniciando pipeline'
    console.error('[noticiero/pipeline/start]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
