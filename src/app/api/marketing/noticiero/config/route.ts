import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { computeNextRunAt } from '@/lib/noticiero/auto-publish-schedule'
import { getNoticieroConfig, updateNoticieroConfig } from '@/lib/noticiero/config-service'
import type { NoticieroConfigUpdatePayload } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'

function validatePayload(body: Partial<NoticieroConfigUpdatePayload>): string | null {
  if (!body.publish_days?.length) return 'Debe haber al menos un día activo'
  if (!body.publish_time?.trim()) return 'La hora de publicación es requerida'
  if (!body.avatar_rotation?.length) return 'Debe haber al menos un avatar activo'
  if (!body.creative_topics || body.creative_topics.length < 3) {
    return 'Se requieren al menos 3 temas creativos'
  }
  return null
}

export async function GET(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const config = await getNoticieroConfig()
    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    if (!config.next_run_at && config.publish_days.length > 0) {
      try {
        const nextRunAt = computeNextRunAt(config.publish_days, config.publish_time)
        const updated = await updateNoticieroConfig(config.id, { next_run_at: nextRunAt })
        return NextResponse.json(updated)
      } catch {
        /* devolver config sin recalcular */
      }
    }

    return NextResponse.json(config)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error leyendo configuración'
    console.error('[noticiero/config GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const existing = await getNoticieroConfig()
    if (!existing) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<NoticieroConfigUpdatePayload>
    const validationError = validatePayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const nextRunAt = computeNextRunAt(body.publish_days!, body.publish_time!)

    const updated = await updateNoticieroConfig(existing.id, {
      publish_days: body.publish_days!,
      publish_time: body.publish_time!,
      vehicle_order: body.vehicle_order!,
      creative_mode: body.creative_mode!,
      creative_topics: body.creative_topics!,
      avatar_rotation: body.avatar_rotation!,
      day_type_config: body.day_type_config!,
      is_active: body.is_active ?? true,
      next_run_at: nextRunAt,
    })

    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error guardando configuración'
    console.error('[noticiero/config PUT]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
