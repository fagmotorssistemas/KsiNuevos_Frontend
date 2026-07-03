import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ message: 'ID de asignación requerido' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error de configuración del servidor'
    return NextResponse.json({ message }, { status: 500 })
  }

  const { data: logRows, error } = await supabase
    .from('script_assignment_schedule_log')
    .select('id, accion, fecha_origen, fecha_destino, justificacion, created_at, created_by')
    .eq('assignment_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const rows = logRows ?? []
  const userIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))]
  const profileMap = new Map<string, { full_name: string | null }>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name })
    }
  }

  const log = rows.map((row) => ({
    ...row,
    profiles: profileMap.get(row.created_by) ?? null,
  }))

  return NextResponse.json({ log })
}
