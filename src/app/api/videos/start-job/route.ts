import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { jobId: string; musicTrackId: string }
    const { jobId, musicTrackId } = body

    if (!jobId || !musicTrackId) {
      return NextResponse.json({ error: 'jobId y musicTrackId son requeridos' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: musicTrack, error: musicError } = await supabase
      .from('music_tracks_v2')
      .select('public_url')
      .eq('id', musicTrackId)
      .eq('is_active', true)
      .single()

    if (musicError || !musicTrack) {
      return NextResponse.json({ error: 'Track de música no encontrado o inactivo' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('video_jobs_v2')
      .update({ music_track_url: musicTrack.public_url, status: 'pending' })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json({ error: `Error actualizando job: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ jobId, status: 'processing' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
