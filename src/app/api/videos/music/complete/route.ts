import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { normalizeTrackName } from '@/lib/videos/music-upload-shared'

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
      path?: unknown
      name?: unknown
      publicUrl?: unknown
    }

    const path = typeof body.path === 'string' ? body.path.trim() : ''
    const publicUrl = typeof body.publicUrl === 'string' ? body.publicUrl.trim() : ''
    const name = normalizeTrackName(typeof body.name === 'string' ? body.name : '')

    if (!path.startsWith('tracks/')) {
      return NextResponse.json({ error: 'path inválido' }, { status: 400 })
    }
    if (!publicUrl) {
      return NextResponse.json({ error: 'publicUrl es requerido' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Nombre del track requerido' }, { status: 400 })
    }

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
