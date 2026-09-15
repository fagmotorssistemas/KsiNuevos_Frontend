import { NextResponse } from 'next/server'
import { requireSatjeAccess } from '@/lib/satje-access'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { attachEmovToConsulta, findActiveEmovConsulta, refreshEmov } from '@/lib/inventario/emovContraste.server'
import { emovActive } from '@/lib/inventario/emovResult'
import { EMOV_ID } from '@/lib/emov'
import { normalizeConsultaPlaca } from '@/lib/inventario/ecuador-api'
import { payloadFromConsulta } from '@/services/contrasteConsultas.service'

export const maxDuration = 60

export async function GET() {
  const access = await requireSatjeAccess('EMOV')
  if ('response' in access) return access.response
  const supabase = await createServerSupabaseClient()
  try {
    const active = await findActiveEmovConsulta(supabase)
    if (!active) {
      return NextResponse.json(
        { plate: null, consultaId: null },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    }
    const refreshed = await refreshEmov(supabase, active)
    const stillActive = emovActive(payloadFromConsulta(refreshed)?.emov)
    const plate = stillActive ? payloadFromConsulta(refreshed)?.plate || refreshed.placa : null
    return NextResponse.json(
      { plate, consultaId: stillActive ? refreshed.id : null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No se pudo revisar el estado EMOV.' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const access = await requireSatjeAccess('EMOV')
  if ('response' in access) return access.response
  const body = await req.json().catch(() => null)
  const supabase = await createServerSupabaseClient()

  if (body?.action === 'start') {
    const placa = typeof body.placa === 'string' ? normalizeConsultaPlaca(body.placa) : null
    const consultaId = typeof body.consultaId === 'string' && EMOV_ID.test(body.consultaId) ? body.consultaId : null
    if (!placa) return NextResponse.json({ error: 'Placa inválida' }, { status: 400 })
    const query = supabase.from('inventory_vehicle_contraste_consultas').select('*').eq('placa', placa)
    const { data: row, error } = consultaId
      ? await query.eq('id', consultaId).maybeSingle()
      : await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return NextResponse.json({ error: 'No se pudo leer el historial' }, { status: 500 })
    if (!row) {
      return NextResponse.json(
        { error: 'Primero consulta SRI / ANT con Consultar nuevamente.' },
        { status: 400 }
      )
    }
    try {
      const result = await attachEmovToConsulta(supabase, row, access.user.id)
      if (result.busyPlate) {
        return NextResponse.json(
          {
            error: `Espera a que termine la consulta EMOV de ${result.busyPlate} antes de consultar otro auto.`,
            plate: result.busyPlate,
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { row: result.row, data: payloadFromConsulta(result.row) },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    } catch {
      return NextResponse.json({ error: 'No se pudo iniciar la consulta EMOV.' }, { status: 502 })
    }
  }

  if (!Array.isArray(body?.ids) || body.ids.length > 10 || body.ids.some((id: unknown) => typeof id !== 'string' || !EMOV_ID.test(id))) {
    return NextResponse.json({ error: 'Consultas inválidas' }, { status: 400 })
  }
  const { data, error } = await supabase.from('inventory_vehicle_contraste_consultas').select('*').in('id', body.ids)
  if (error) return NextResponse.json({ error: 'No se pudo leer el historial' }, { status: 500 })
  try {
    const rows = await Promise.all((data || []).map((row) => refreshEmov(supabase, row)))
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar el historial EMOV.' }, { status: 502 })
  }
}
