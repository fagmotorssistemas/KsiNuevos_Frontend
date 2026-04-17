import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType } from '@/lib/videos-v2/types'
import { VIDEO_V2_MAX_CLIPS } from '@/lib/videos-v2/clip-config'
import { startPipelineBackground } from '@/lib/videos-v2/pipeline'

// Aumentar límite de body para uploads de video grandes (hasta 2 GB)
export const maxDuration = 300 // 5 minutos máximo de ejecución
export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/avi',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
])

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const musicTrackId = formData.get('musicTrackId') as string | null

    if (!musicTrackId) {
      return NextResponse.json({ error: 'musicTrackId es requerido' }, { status: 400 })
    }

    // Recolectar todos los archivos de video
    const videoFiles: File[] = []
    for (const [, value] of formData.entries()) {
      if (value instanceof File && ALLOWED_MIME_TYPES.has(value.type)) {
        videoFiles.push(value)
      }
    }

    if (videoFiles.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un archivo de video válido (mp4, mov, avi, webm, mkv)' },
        { status: 400 }
      )
    }

    if (videoFiles.length > VIDEO_V2_MAX_CLIPS) {
      return NextResponse.json(
        { error: `Máximo ${VIDEO_V2_MAX_CLIPS} clips permitidos por job` },
        { status: 400 }
      )
    }

    const flowType: FlowType = videoFiles.length === 1 ? 'single' : 'multiple'

    const supabase = getServiceClient()

    // Obtener URL del track de música
    const { data: musicTrack, error: musicError } = await supabase
      .from('music_tracks_v2')
      .select('public_url')
      .eq('id', musicTrackId)
      .eq('is_active', true)
      .single()

    if (musicError || !musicTrack) {
      return NextResponse.json({ error: 'Track de música no encontrado o inactivo' }, { status: 404 })
    }

    // Crear registro inicial en video_jobs_v2
    const { data: job, error: insertError } = await supabase
      .from('video_jobs_v2')
      .insert({
        flow_type: flowType,
        raw_video_paths: [],
        status: 'pending',
        current_step: 'Iniciando...',
        progress_percentage: 0,
        music_track_url: musicTrack.public_url,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      return NextResponse.json(
        { error: `Error al crear el job: ${insertError?.message}` },
        { status: 500 }
      )
    }

    const jobId = job.id

    // Leer buffers de todos los archivos
    const files: Array<{ buffer: Buffer; filename: string; mimeType: string }> = []
    for (const file of videoFiles) {
      const arrayBuffer = await file.arrayBuffer()
      files.push({
        buffer: Buffer.from(arrayBuffer),
        filename: file.name,
        mimeType: file.type,
      })
    }

    // Disparar pipeline en background (fire and forget)
    startPipelineBackground({
      jobId,
      flowType,
      files,
      musicTrackUrl: musicTrack.public_url,
    })

    return NextResponse.json({
      jobId,
      status: 'pending',
      flowType,
      message: 'Job creado exitosamente. El pipeline está procesando en segundo plano.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[VideoV2][/upload] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
