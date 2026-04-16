/**
 * POST /api/videos-v2/jobs/start
 *
 * Recibe el jobId y los paths de los archivos ya subidos a Supabase Storage.
 * Actualiza el job con los paths y dispara el pipeline en background.
 *
 * Body JSON: { jobId, paths: string[] }
 * Response:  { jobId, status: 'processing' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { startPipelineBackground } from '@/lib/videos-v2/pipeline'
import { getSignedUrlForPath } from '@/lib/videos-v2/storage'

function getServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface StartJobBody {
  jobId: string
  paths: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartJobBody
    const { jobId, paths } = body

    if (!jobId || !paths?.length) {
      return NextResponse.json(
        { error: 'jobId y paths son requeridos' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Obtener datos del job (music_track_url y flow_type)
    const { data: job, error: fetchError } = await supabase
      .from('video_jobs_v2')
      .select('flow_type, music_track_url')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    if (!job.music_track_url) {
      return NextResponse.json({ error: 'El job no tiene un track de música asignado' }, { status: 400 })
    }

    // Actualizar paths en el job
    const { error: updateError } = await supabase
      .from('video_jobs_v2')
      .update({
        raw_video_paths: paths,
        status: 'uploading',
        current_step: 'Archivos recibidos. Iniciando pipeline...',
        progress_percentage: 20,
      })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json(
        { error: `Error actualizando job: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Obtener URLs firmadas de los archivos ya subidos para el pipeline
    const signedUrls = await Promise.all(
      paths.map((path) => getSignedUrlForPath(path))
    )

    // Construir los "files" virtuales para el pipeline (solo necesita el buffer si hay compresión,
    // pero dado que el usuario ya subió directamente, pasamos los paths y el pipeline
    // generará sus propias URLs firmadas cuando las necesite)
    const flowType = job.flow_type as 'single' | 'multiple'
    const musicTrackUrl = job.music_track_url

    // Fire and forget: el pipeline lee los archivos desde Supabase Storage
    startPipelineFromPaths({
      jobId,
      flowType,
      paths,
      signedUrls,
      musicTrackUrl,
    })

    return NextResponse.json({ jobId, status: 'processing' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Dispara el pipeline usando paths ya subidos en Storage (no buffers locales).
 * El pipeline leerá los archivos directamente desde Supabase usando URLs firmadas.
 */
function startPipelineFromPaths(params: {
  jobId: string
  flowType: 'single' | 'multiple'
  paths: string[]
  signedUrls: string[]
  musicTrackUrl: string
}) {
  const { jobId, flowType, paths, signedUrls, musicTrackUrl } = params

  // Pasamos buffers vacíos — el pipeline los ignorará porque los paths ya están en Storage.
  // El pipeline usará getSignedUrlForPath(path) internamente.
  const files = paths.map((path, i) => ({
    buffer: Buffer.alloc(0), // vacío — no se usa, el pipeline lee desde Storage
    filename: path.split('/').pop() ?? `clip_${i}.mp4`,
    mimeType: 'video/mp4',
    alreadyUploaded: true,
    path,
    signedUrl: signedUrls[i],
  }))

  startPipelineBackground({ jobId, flowType, files, musicTrackUrl })
}
