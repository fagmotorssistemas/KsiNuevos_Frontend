import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { CreatomateWebhookPayload } from '@/lib/videos-v2/types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreatomateWebhookPayload

    console.log(`[VideoV2Webhook][Creatomate] Payload recibido: status=${payload.status}, id=${payload.id}, metadata=${payload.metadata}`)

    // El jobId viene en el campo metadata
    const jobId = payload.metadata
    if (!jobId) {
      console.error('[VideoV2Webhook][Creatomate] No se encontró jobId en metadata')
      return NextResponse.json({ ok: true })
    }

    const supabase = getServiceClient()

    if (payload.status === 'succeeded') {
      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'completed',
          final_video_url: payload.url ?? null,
          final_video_duration: payload.duration ?? null,
          progress_percentage: 100,
          current_step: 'Video listo',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Creatomate] Error actualizando job ${jobId}: ${error.message}`)
      } else {
        console.log(`[VideoV2Webhook][Creatomate] Job ${jobId} completado. URL: ${payload.url}`)
      }
    } else if (payload.status === 'failed') {
      const { error } = await supabase
        .from('video_jobs_v2')
        .update({
          status: 'failed',
          error_message: payload.error_message ?? 'Creatomate reportó un error al renderizar',
          current_step: 'Error en renderizado',
        })
        .eq('id', jobId)

      if (error) {
        console.error(`[VideoV2Webhook][Creatomate] Error actualizando job fallido ${jobId}: ${error.message}`)
      } else {
        console.log(`[VideoV2Webhook][Creatomate] Job ${jobId} falló: ${payload.error_message}`)
      }
    }

    // Siempre responder 200 para confirmar recepción
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando webhook'
    console.error(`[VideoV2Webhook][Creatomate] Error: ${message}`)
    // Aún así responder 200 para evitar reintentos de Creatomate
    return NextResponse.json({ ok: true })
  }
}
