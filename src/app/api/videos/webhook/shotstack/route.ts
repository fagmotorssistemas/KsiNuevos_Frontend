import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { resolveFinalReelVideoUrl } from '@/lib/videos/storage'
import { getShotstackRenderStatus } from '@/lib/videos/shotstack'

export const runtime = 'nodejs'
export const maxDuration = 300

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Solo se usan `id` y `status` como aviso; el resto se confirma con la API de Shotstack. */
type ShotstackWebhookPayload = {
  status?: string
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

    const status = (payload.status ?? '').toLowerCase()
    if (status !== 'done' && status !== 'failed') {
      return NextResponse.json({ ok: true })
    }

    const supabase = getServiceClient()
    const { data: job, error: jobError } = await supabase
      .from('video_jobs_v2')
      .select('social_publish_stage, creatomate_render_id')
      .eq('id', jobId)
      .maybeSingle()
    if (jobError) {
      // El monitor del pipeline sigue consultando a Shotstack y cierra el job igual.
      console.error(`[VideoV2Webhook][Shotstack] No se pudo leer el job ${jobId}: ${jobError.message}`)
      return NextResponse.json({ ok: true })
    }
    if (!job) {
      // Se borró mientras renderizaba: no bajar ni guardar un video que nadie va a usar.
      console.warn(`[VideoV2Webhook][Shotstack] Job ${jobId} ya no existe; se ignora el render.`)
      return NextResponse.json({ ok: true })
    }

    // El aviso no viene firmado: cualquiera podría mandarlo. Solo se acepta para el render
    // vigente del job, y el estado y la URL se piden a Shotstack con nuestra API key.
    const renderId = payload.id?.trim()
    if (!renderId || (job.creatomate_render_id && job.creatomate_render_id !== renderId)) {
      console.warn(
        `[VideoV2Webhook][Shotstack] Render ${renderId ?? '(sin id)'} no es el del job ${jobId} (${job.creatomate_render_id ?? 'sin render'}); se ignora.`
      )
      return NextResponse.json({ ok: true })
    }
    const render = await getShotstackRenderStatus(renderId)

    if (render.status === 'done') {
      const finalUrl = await resolveFinalReelVideoUrl(render.url, jobId)

      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'completed',
          final_video_url: finalUrl,
          progress_percentage: 100,
          current_step: 'Video listo',
          social_publish_stage: job.social_publish_stage ?? 'generado',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Shotstack] Error actualizando job ${jobId}: ${error.message}`)
      } else {
        console.log(`[VideoV2Webhook][Shotstack] Job ${jobId} completado. final_video_url=${finalUrl}`)
      }
    } else if (render.status === 'failed') {
      console.error('[Shotstack][webhook] Render failed:', JSON.stringify(render))
      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'failed',
          error_message: render.error ?? 'Shotstack reportó fallo al renderizar',
          current_step: 'Error en renderizado',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Shotstack] Error job fallido ${jobId}: ${error.message}`)
      }
    } else {
      console.warn(`[VideoV2Webhook][Shotstack] Aviso "${status}" pero Shotstack dice status=${render.status}; se ignora.`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando webhook'
    console.error(`[VideoV2Webhook][Shotstack] Error: ${message}`)
    return NextResponse.json({ ok: true })
  }
}
