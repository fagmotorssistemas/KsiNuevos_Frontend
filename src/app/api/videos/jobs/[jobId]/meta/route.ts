import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { VideoJobStatus, VideoSocialPublishStage } from '@/lib/videos/types'
import { buildJobNameFromInventory } from '@/lib/videos/resolve-job-vehicle'

const ALLOWED_STATUS: VideoJobStatus[] = [
  'pending',
  'uploading',
  'transcribing',
  'analyzing',
  'rendering',
  'completed',
  'failed',
]

const ALLOWED_SOCIAL_STAGE: VideoSocialPublishStage[] = [
  'generado',
  'aprobado',
  'programado',
  'publicado',
  'fallido',
]

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface PatchBody {
  status?: VideoJobStatus
  jobName?: string | null
  /** UUID en inventoryoracle; null para desvincular. */
  inventoryVehicleId?: string | null
  /** Flujo publicación redes (solo jobs completados). */
  socialPublishStage?: VideoSocialPublishStage
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = (await request.json()) as PatchBody
    const supabase = getServiceClient()
    const updates: Database['public']['Tables']['video_jobs_v2']['Update'] = {}

    if (body.socialPublishStage !== undefined) {
      if (!ALLOWED_SOCIAL_STAGE.includes(body.socialPublishStage)) {
        return NextResponse.json({ error: 'socialPublishStage no permitido' }, { status: 400 })
      }
      const { data: prevJob } = await supabase.from('video_jobs_v2').select('status').eq('id', jobId).single()
      if (prevJob?.status !== 'completed') {
        return NextResponse.json(
          { error: 'socialPublishStage solo aplica a jobs con video completado' },
          { status: 400 }
        )
      }
      updates.social_publish_stage = body.socialPublishStage
      updates.updated_at = new Date().toISOString()
    }

    if (body.status !== undefined) {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'Estado no permitido' }, { status: 400 })
      }

      updates.status = body.status
      updates.updated_at = new Date().toISOString()

      if (body.status === 'failed') {
        updates.error_message = 'Marcado manualmente como fallido'
      } else if (body.status === 'completed') {
        updates.error_message = null
        updates.current_step = 'Completado manualmente'
        updates.progress_percentage = 100
      }
    }

    if (body.jobName !== undefined) {
      const normalized =
        typeof body.jobName === 'string' && body.jobName.trim().length > 0
          ? body.jobName.trim().slice(0, 100)
          : null
      updates.job_name = normalized
    }

    if (body.inventoryVehicleId !== undefined) {
      const raw = body.inventoryVehicleId
      if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        updates.inventory_vehicle_id = null
      } else if (typeof raw === 'string') {
        const vehicleId = raw.trim()
        const { data: inv, error: invErr } = await supabase
          .from('inventoryoracle')
          .select('id, brand, model, year')
          .eq('id', vehicleId)
          .single()

        if (invErr || !inv) {
          return NextResponse.json({ error: 'Vehículo no encontrado en inventario' }, { status: 400 })
        }

        updates.inventory_vehicle_id = inv.id
        updates.vehicle_line_1 = inv.brand
        updates.vehicle_line_2 = inv.model
        updates.vehicle_line_4 = inv.year != null ? String(inv.year) : null
        if (body.jobName === undefined) {
          updates.job_name = buildJobNameFromInventory(inv.brand, inv.model, inv.year)
        }
      } else {
        return NextResponse.json({ error: 'inventoryVehicleId inválido' }, { status: 400 })
      }
      updates.updated_at = new Date().toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('video_jobs_v2')
      .update(updates)
      .eq('id', jobId)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Job no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
