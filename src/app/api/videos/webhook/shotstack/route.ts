import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { resolveFinalReelVideoUrl } from '@/lib/videos/storage'

export const runtime = 'nodejs'
export const maxDuration = 300

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type ShotstackWebhookPayload = {
  status?: string
  url?: string
  error?: string
  id?: string
}

export async function POST(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId')
    const payload = (await request.json()) as ShotstackWebhookPayload

    console.log(
      `[VideoV2Webhook][Shotstack] status=${payload.status}, id=${payload.id}, jobId=${jobId}`
    )

    if (!jobId) {
      console.error('[VideoV2Webhook][Shotstack] Falta jobId en query')
      return NextResponse.json({ ok: true })
    }

    const supabase = getServiceClient()
    const status = (payload.status ?? '').toLowerCase()

    if (status === 'done') {
      const { data: prev } = await supabase
        .from('video_jobs_v2')
        .select('social_publish_stage')
        .eq('id', jobId)
        .single()

      const finalUrl = await resolveFinalReelVideoUrl(payload.url, jobId)

      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'completed',
          final_video_url: finalUrl,
          progress_percentage: 100,
          current_step: 'Video listo',
          social_publish_stage: prev?.social_publish_stage ?? 'generado',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Shotstack] Error actualizando job ${jobId}: ${error.message}`)
      } else {
        console.log(`[VideoV2Webhook][Shotstack] Job ${jobId} completado. final_video_url=${finalUrl}`)
      }
    } else if (status === 'failed') {
      console.error('[Shotstack][webhook] Render failed body:', JSON.stringify(payload))
      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'failed',
          error_message: payload.error ?? 'Shotstack reportó fallo al renderizar',
          current_step: 'Error en renderizado',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Shotstack] Error job fallido ${jobId}: ${error.message}`)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando webhook'
    console.error(`[VideoV2Webhook][Shotstack] Error: ${message}`)
    return NextResponse.json({ ok: true })
  }
}
