import { NextResponse } from 'next/server'
import { requireSatjeAccess } from '@/lib/satje-access'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { refreshEmov } from '@/lib/inventario/emovContraste.server'
import { EMOV_ID } from '@/lib/emov'

export const maxDuration = 60

export async function POST(req: Request) {
  const access = await requireSatjeAccess('EMOV')
  if ('response' in access) return access.response
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.ids) || body.ids.length > 10 || body.ids.some((id: unknown) => typeof id !== 'string' || !EMOV_ID.test(id))) {
    return NextResponse.json({ error: 'Consultas inválidas' }, { status: 400 })
  }
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('inventory_vehicle_contraste_consultas').select('*').in('id', body.ids)
  if (error) return NextResponse.json({ error: 'No se pudo leer el historial' }, { status: 500 })
  try {
    const rows = await Promise.all((data || []).map(row => refreshEmov(supabase, row)))
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar el historial EMOV.' }, { status: 502 })
  }
}
