import { NextRequest, NextResponse } from 'next/server'
import { VIDEO_SCRIPT_LIST_SELECT } from '@/lib/marketing/video-script-select'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const raw = request.nextUrl.searchParams.get('assignment_ids')?.trim()
  if (!raw) {
    return NextResponse.json({ scripts: [] })
  }

  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ scripts: [] })
  }

  // Tras validar sesión + plan-videos, leer como marketing (sin RLS por vendedor).
  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error de configuración del servidor'
    return NextResponse.json({ message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('video_scripts')
    .select(VIDEO_SCRIPT_LIST_SELECT)
    .in('assignment_id', ids)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ scripts: data ?? [] })
}
