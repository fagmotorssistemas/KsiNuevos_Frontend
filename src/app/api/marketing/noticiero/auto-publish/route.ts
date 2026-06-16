import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  executeNoticieroAutoPublishPlan,
  planNoticieroAutoPublish,
  runNoticieroAutoPublish,
} from '@/lib/noticiero/auto-publish-service'

export const dynamic = 'force-dynamic'
/** HeyGen + Creatomate + Meta pueden tardar varios minutos. */
export const maxDuration = 300

/**
 * Cron Vercel: schedule "0 14 * * 1,3,5"
 * - Minuto 0, hora 14 UTC = 9:00 AM hora Ecuador (UTC-5, sin DST)
 * - Días 1,3,5 = Lunes, Miércoles, Viernes
 *
 * Vercel Cron siempre ejecuta en UTC. Ecuador (Guayaquil) está en UTC-5.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('Authorization')
  const isCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isCron) {
    const auth = await requireMarketingSession(request)
    if (!auth.ok) return auth.response
  }

  try {
    if (isCron) {
      const result = await runNoticieroAutoPublish({ manual: false, force: false })
      console.log('[noticiero/auto-publish cron]', JSON.stringify(result))
      return NextResponse.json(result)
    }

    const planned = await planNoticieroAutoPublish({ manual: true, force: true })
    if (planned.skipped || !planned.plan) {
      return NextResponse.json(planned)
    }

    after(() => {
      void executeNoticieroAutoPublishPlan(planned.plan!).then((result) => {
        console.log('[noticiero/auto-publish manual]', JSON.stringify(result))
      })
    })

    return NextResponse.json({
      historyId: planned.historyId,
      contentType: planned.contentType,
      avatarId: planned.avatarId,
      status: 'pending',
      message: 'Publicación automática iniciada. El progreso se actualizará en el historial.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en auto-publish'
    console.error('[noticiero/auto-publish]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
