/**
 * POST /api/videos/raw-clips/library/create
 *
 * Crea un job contenedor en biblioteca y devuelve URLs firmadas para subir clips en bruto.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import type { FlowType } from '@/lib/videos/types'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'
import { buildJobNameFromInventory } from '@/lib/videos/resolve-job-vehicle'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

const RAW_BUCKET = 'raw-videos-v2'

function sanitizeStorageFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() || 'video.mp4'
  const dot = base.lastIndexOf('.')
  const extRaw = dot >= 0 ? base.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? base.slice(0, dot) : base
  const ext = /^\.[a-z0-9]{1,8}$/.test(extRaw) ? extRaw : '.mp4'
  const slug = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'clip'
  return `${slug}${ext}`
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface FileInfo {
  filename: string
  mimeType: string
}

interface CreateLibraryBody {
  inventory_vehicle_id: string
  files: FileInfo[]
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as CreateLibraryBody
    const inventoryVehicleId = body.inventory_vehicle_id?.trim()
    const files = body.files ?? []

    if (!inventoryVehicleId) {
      return NextResponse.json({ error: 'inventory_vehicle_id es requerido' }, { status: 400 })
    }

    if (!files.length) {
      return NextResponse.json({ error: 'Selecciona al menos un clip de video' }, { status: 400 })
    }

    if (files.length > VIDEO_MAX_CLIPS) {
      return NextResponse.json(
        { error: `Máximo ${VIDEO_MAX_CLIPS} clips por carpeta` },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    const { data: invRow, error: invError } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year')
      .eq('id', inventoryVehicleId)
      .maybeSingle()

    if (invError || !invRow) {
      return NextResponse.json({ error: 'Vehículo no encontrado en inventario' }, { status: 404 })
    }

    const flowType: FlowType = files.length >= 2 ? 'multiple' : 'single'
    const jobName = buildJobNameFromInventory(
      String(invRow.brand ?? ''),
      String(invRow.model ?? ''),
      invRow.year
    )

    const libraryMeta = {
      _v2_library_only: true,
      vehicleId: inventoryVehicleId,
    } as unknown as Json

    const { data: job, error: insertError } = await supabase
      .from('video_jobs_v2')
      .insert({
        flow_type: flowType,
        raw_video_paths: [],
        status: 'pending',
        current_step: 'Biblioteca — subiendo clips…',
        progress_percentage: 0,
        inventory_vehicle_id: inventoryVehicleId,
        job_name: jobName || null,
        selected_clips: libraryMeta,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      return NextResponse.json(
        { error: `Error creando carpeta: ${insertError?.message ?? 'desconocido'}` },
        { status: 500 }
      )
    }

    const jobId = job.id
    const uploads: Array<{ path: string; signedUrl: string; token: string }> = []

    for (let i = 0; i < files.length; i++) {
      const { filename } = files[i]
      const safeFilename = sanitizeStorageFilename(filename)
      const timestamp = Date.now() + i
      const path =
        flowType === 'single'
          ? `${jobId}/${timestamp}_${safeFilename}`
          : `${jobId}/clip_${i}_${timestamp}_${safeFilename}`

      const { data: signedData, error: signedError } = await supabase.storage
        .from(RAW_BUCKET)
        .createSignedUploadUrl(path)

      if (signedError || !signedData) {
        await supabase.from('video_jobs_v2').delete().eq('id', jobId)
        return NextResponse.json(
          { error: `Error generando URL de upload para ${filename}: ${signedError?.message}` },
          { status: 500 }
        )
      }

      uploads.push({
        path,
        signedUrl: signedData.signedUrl,
        token: signedData.token,
      })
    }

    return NextResponse.json({ jobId, uploads, flowType })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-clips/library/create]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
