import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { scheduleRawFullVideoPublish } from '@/lib/videos/schedule-raw-full-publish'
import type { PublishingPlatform } from '@/lib/videos/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isPlatform(x: string): x is PublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      folderId?: string
      videoPath?: string
      caption?: string
      platforms?: string[]
      scheduledAt?: string
      vehicleId?: string | null
    }

    const platforms = (body.platforms ?? []).filter(isPlatform)
    const result = await scheduleRawFullVideoPublish({
      folderId: body.folderId ?? '',
      videoPath: body.videoPath ?? '',
      caption: body.caption ?? '',
      platforms,
      scheduledAtIso: body.scheduledAt ?? '',
      vehicleId: body.vehicleId,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/schedule]', message)
    const status =
      message.includes('requerido') ||
      message.includes('Selecciona') ||
      message.includes('pasado') ||
      message.includes('inválida')
        ? 400
        : message.includes('no encontrada')
          ? 404
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
