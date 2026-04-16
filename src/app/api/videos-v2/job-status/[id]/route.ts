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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: job, error } = await supabase
      .from('video_jobs_v2')
      .select(
        'id, status, progress_percentage, current_step, error_message, final_video_url, final_video_duration, gemini_analysis, flow_type, created_at, updated_at, assemblyai_transcript_id, creatomate_render_id, raw_video_paths, selected_clips, music_track_url'
      )
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
