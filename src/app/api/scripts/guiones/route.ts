import { NextRequest, NextResponse } from 'next/server'
import { VIDEO_SCRIPT_LIST_SELECT } from '@/lib/marketing/video-script-select'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const raw = request.nextUrl.searchParams.get('assignment_ids')?.trim()
  if (!raw) {
    return NextResponse.json({ scripts: [] })
  }

  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ scripts: [] })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('video_scripts')
    .select(VIDEO_SCRIPT_LIST_SELECT)
    .in('assignment_id', ids)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ scripts: data ?? [] })
}
