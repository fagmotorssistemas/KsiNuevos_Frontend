/**
 * POST /api/videos-v2/jobs/[jobId]/voice-over-audio
 *
 * Sube el audio de voz en off al bucket `music-tracks-v2` (admite audio).
 * El bucket `raw-videos-v2` suele rechazar audio/mpeg (415).
 *
 * Body: multipart FormData con campo `file`.
 * Response: { path } — usar `path` como `voiceOverAudioPath` en /jobs/start.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { uploadJobVoiceOverAudioToMusicBucket } from '@/lib/videos-v2/storage'

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
])

const MAX_BYTES = 80 * 1024 * 1024

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    const { jobId } = await params
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId inválido' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: job, error: jobErr } = await supabase
      .from('video_jobs_v2')
      .select('id')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 })
    }

    let mimeType = (file.type && file.type.trim()) || ''
    if (!mimeType || !ALLOWED_AUDIO_TYPES.has(mimeType)) {
      const lower = file.name.trim().toLowerCase()
      if (lower.endsWith('.mp3')) mimeType = 'audio/mpeg'
      else if (lower.endsWith('.wav')) mimeType = 'audio/wav'
      else if (lower.endsWith('.aac')) mimeType = 'audio/aac'
      else if (lower.endsWith('.m4a')) mimeType = 'audio/mp4'
    }
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Tipo de audio no permitido: ${file.type || '(vacío)'}. Usa mp3, wav, aac o m4a.` },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo de audio es demasiado grande (máx. 80 MB).' }, { status: 400 })
    }
    if (buf.length < 256) {
      return NextResponse.json({ error: 'Archivo de audio demasiado pequeño o vacío.' }, { status: 400 })
    }

    const { path } = await uploadJobVoiceOverAudioToMusicBucket(jobId, buf, file.name, mimeType)

    return NextResponse.json({ path })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/.../voice-over-audio]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
