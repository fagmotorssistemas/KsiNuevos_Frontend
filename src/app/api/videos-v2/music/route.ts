import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { uploadMusicTrackV2 } from '@/lib/videos-v2/storage'

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
])

const EXT_TO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
}

export const maxDuration = 300

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * Muchos MP3 llegan como `application/octet-stream` o con `type` vacío según SO/navegador.
 */
function resolveAudioMimeType(file: File): string | null {
  const t = (file.type || '').trim().toLowerCase()
  if (ALLOWED_AUDIO_TYPES.has(t)) {
    if (t === 'audio/x-m4a') return 'audio/mp4'
    return t
  }
  if (t === 'application/octet-stream' || t === '' || t === 'application/x-unknown') {
    const ext = extensionFromFilename(file.name)
    const mapped = EXT_TO_MIME[ext]
    if (mapped) return mapped
  }
  return null
}

function normalizeTrackName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 200)
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data: tracks, error } = await supabase
      .from('music_tracks_v2')
      .select('id, name, public_url, duration_seconds, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tracks: tracks ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const nameRaw = formData.get('name') as string | null

    if (!file) return NextResponse.json({ error: 'Archivo de audio requerido' }, { status: 400 })

    const name = normalizeTrackName(typeof nameRaw === 'string' ? nameRaw : '')
    if (!name) return NextResponse.json({ error: 'Nombre del track requerido' }, { status: 400 })

    const mimeType = resolveAudioMimeType(file)
    if (!mimeType) {
      const reported = file.type || '(vacío)'
      return NextResponse.json(
        {
          error: `No se reconoció el audio (tipo: ${reported}). Sube mp3, wav, aac o m4a; si es MP3, comprueba la extensión .mp3 en el nombre del archivo.`,
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { path, publicUrl } = await uploadMusicTrackV2(buffer, file.name, mimeType)

    const supabase = getServiceClient()
    const { data: track, error: insertError } = await supabase
      .from('music_tracks_v2')
      .insert({
        name,
        file_path: path,
        public_url: publicUrl,
        is_active: true,
      })
      .select('id, name, public_url, duration_seconds, is_active')
      .single()

    if (insertError || !track) {
      return NextResponse.json({ error: `Error creando track: ${insertError?.message}` }, { status: 500 })
    }

    return NextResponse.json({ track }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase.from('music_tracks_v2').update({ is_active: false }).eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
