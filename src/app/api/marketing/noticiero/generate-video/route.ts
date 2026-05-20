import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { requireNoticieroEnv } from '@/lib/noticiero/env'
import { renderNoticieroTemplate } from '@/lib/noticiero/creatomate-template'
import { updateNoticieroJob } from '@/lib/noticiero/jobs'
import { isBannerTitleValid, normalizeBannerTitle } from '@/lib/noticiero/banner-title'
import { generateCustomBannerTitle, generateVehicleHeadline } from '@/lib/noticiero/gemini'
import type { GenerateVideoRequest, NoticieroVehicle } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function parseVehicle(body: Partial<NoticieroVehicle>): NoticieroVehicle | null {
  if (!body?.brand || !body.model) return null
  return {
    id: String(body.id ?? ''),
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
    requireNoticieroEnv()
    const body = (await request.json()) as GenerateVideoRequest & { bannerTitle?: string }

    const heygenVideoUrl = body.heygenVideoUrl?.trim()
    if (!heygenVideoUrl) {
      return NextResponse.json({ error: 'heygenVideoUrl es requerido' }, { status: 400 })
    }

    let bannerTitle = body.bannerTitle?.trim() ? normalizeBannerTitle(body.bannerTitle) : ''

    if (!isBannerTitleValid(bannerTitle)) {
      if (body.mode === 'vehicle') {
        const vehicle = parseVehicle(body.vehicle ?? {})
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehículo inválido para el banner' }, { status: 400 })
        }
        bannerTitle = await generateVehicleHeadline(vehicle)
      } else if (body.mode === 'custom') {
        const topic = body.customTopic?.trim()
        if (!topic) {
          return NextResponse.json({ error: 'customTopic es requerido para el banner' }, { status: 400 })
        }
        bannerTitle = await generateCustomBannerTitle(topic)
      } else {
        return NextResponse.json({ error: 'mode debe ser "vehicle" o "custom"' }, { status: 400 })
      }
    }

    console.log('[noticiero/generate-video] Componiendo con Creatomate, banner=', bannerTitle)
    const { renderId, videoUrl } = await renderNoticieroTemplate(heygenVideoUrl, bannerTitle)

    const jobId = body.jobId?.trim()
    if (jobId) {
      await updateNoticieroJob(jobId, {
        final_video_url: videoUrl,
        creatomate_render_id: renderId,
        banner_title: bannerTitle,
        status: 'completed',
        current_step: 'done',
        progress_percentage: 100,
        social_publish_stage: 'generado',
        error_message: null,
      })
    }

    return NextResponse.json({ videoUrl, bannerTitle, renderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error componiendo video con Creatomate'
    console.error('[noticiero/generate-video]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
