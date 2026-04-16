import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { uploadMusicTrackV2 } from '@/lib/videos-v2/storage'

const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac'])

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
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
    const name = formData.get('name') as string | null

    if (!file) return NextResponse.json({ error: 'Archivo de audio requerido' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Nombre del track requerido' }, { status: 400 })

    // Validar tipo de archivo
    const mimeType = file.type
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${mimeType}. Solo se aceptan mp3, wav, aac.` },
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
    const { error } = await supabase
      .from('music_tracks_v2')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
