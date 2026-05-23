import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  MAX_MUSIC_UPLOAD_BYTES,
  MUSIC_TRACKS_BUCKET,
  musicUploadSizeError,
  resolveAudioMimeType,
} from '@/lib/videos/music-upload-shared'
import { buildMusicTrackStoragePath } from '@/lib/videos/storage'

export const runtime = 'nodejs'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      filename?: unknown
      size?: unknown
      mimeType?: unknown
    }

    const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
    if (!filename) {
      return NextResponse.json({ error: 'filename es requerido' }, { status: 400 })
    }

    const size = typeof body.size === 'number' ? body.size : Number(body.size)
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'size inválido' }, { status: 400 })
    }
    if (size > MAX_MUSIC_UPLOAD_BYTES) {
      return NextResponse.json({ error: musicUploadSizeError() }, { status: 413 })
    }

    const mimeType = resolveAudioMimeType(
      filename,
      typeof body.mimeType === 'string' ? body.mimeType : ''
    )
    if (!mimeType) {
      return NextResponse.json(
        {
          error:
            'No se reconoció el audio. Sube mp3, wav, aac o m4a; si es MP3, comprueba la extensión .mp3 en el nombre del archivo.',
        },
        { status: 400 }
      )
    }

    const path = buildMusicTrackStoragePath(filename)
    const supabase = getServiceClient()

    const { data: signedData, error: signedError } = await supabase.storage
      .from(MUSIC_TRACKS_BUCKET)
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      return NextResponse.json(
        { error: `Error generando URL de subida: ${signedError?.message ?? 'desconocido'}` },
        { status: 500 }
      )
    }

    const { data: publicData } = supabase.storage.from(MUSIC_TRACKS_BUCKET).getPublicUrl(path)

    return NextResponse.json({
      path,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      publicUrl: publicData.publicUrl,
      mimeType,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
