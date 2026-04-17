/**
 * POST /api/videos-v2/jobs/create
 *
 * Crea el registro del job en la DB y devuelve URLs firmadas de upload
 * para que el browser suba los videos DIRECTAMENTE a Supabase Storage,
 * sin pasar por el servidor de Next.js (evita el límite de 10 MB).
 *
 * Body JSON: { flowType, files: [{filename, mimeType}], musicTrackId }
 * Response:  { jobId, uploads: [{path, signedUrl}] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType } from '@/lib/videos-v2/types'
import { VIDEO_V2_MAX_CLIPS } from '@/lib/videos-v2/clip-config'

const RAW_BUCKET = 'raw-videos-v2'

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

interface CreateJobBody {
  flowType: FlowType
  files: FileInfo[]
  musicTrackId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateJobBody
    const { flowType, files, musicTrackId } = body

    if (!flowType || !files?.length || !musicTrackId) {
      return NextResponse.json(
        { error: 'flowType, files y musicTrackId son requeridos' },
        { status: 400 }
      )
    }

    if (files.length > VIDEO_V2_MAX_CLIPS) {
      return NextResponse.json(
        { error: `Máximo ${VIDEO_V2_MAX_CLIPS} clips permitidos por job` },
        { status: 400 }
      )
    }

    if (flowType === 'multiple' && files.length < 2) {
      return NextResponse.json(
        { error: 'El flujo múltiple requiere al menos 2 clips' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Verificar que el track de música existe
    const { data: musicTrack, error: musicError } = await supabase
      .from('music_tracks_v2')
      .select('public_url')
      .eq('id', musicTrackId)
      .eq('is_active', true)
      .single()

    if (musicError || !musicTrack) {
      return NextResponse.json(
        { error: 'Track de música no encontrado o inactivo' },
        { status: 404 }
      )
    }

    // Crear registro inicial del job
    const { data: job, error: insertError } = await supabase
      .from('video_jobs_v2')
      .insert({
        flow_type: flowType,
        raw_video_paths: [],
        status: 'pending',
        current_step: 'Esperando subida de archivos...',
        progress_percentage: 0,
        music_track_url: musicTrack.public_url,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      return NextResponse.json(
        { error: `Error creando job: ${insertError?.message}` },
        { status: 500 }
      )
    }

    const jobId = job.id

    // Generar URLs firmadas para que el browser suba directamente a Supabase
    const uploads: Array<{ path: string; signedUrl: string; token: string }> = []

    for (let i = 0; i < files.length; i++) {
      const { filename } = files[i]
      const timestamp = Date.now() + i
      const path =
        flowType === 'single'
          ? `${jobId}/${timestamp}_${filename}`
          : `${jobId}/clip_${i}_${timestamp}_${filename}`

      const { data: signedData, error: signedError } = await supabase.storage
        .from(RAW_BUCKET)
        .createSignedUploadUrl(path)

      if (signedError || !signedData) {
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

    return NextResponse.json({ jobId, uploads })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/create] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
