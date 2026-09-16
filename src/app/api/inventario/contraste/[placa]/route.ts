import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const maxDuration = 60
import { attachJuiciosToContraste, loadJuiciosForOwner } from '@/lib/inventario/consultas-ec'
import { EcuadorApiError, fetchEcuadorContraste, normalizeConsultaPlaca } from '@/lib/inventario/ecuador-api'
import { payloadFromConsulta } from '@/services/contrasteConsultas.service'
import { resolveOwnerIdentityForContraste } from '@/services/vehicleLegal.service'

async function handleContraste(rawPlaca: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const placa = normalizeConsultaPlaca(decodeURIComponent(rawPlaca || ''))
  if (!placa) {
    return NextResponse.json(
      { error: 'Placa inválida. Usa letras y números, sin guiones.' },
      { status: 400 }
    )
  }

  try {
    const data = await fetchEcuadorContraste(placa)
    const { data: latest } = await supabase
      .from('inventory_vehicle_contraste_consultas')
      .select('*')
      .eq('placa', placa)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const previousEmov = latest ? payloadFromConsulta(latest)?.emov : null
    if (previousEmov) data.emov = previousEmov
    const owner = await resolveOwnerIdentityForContraste(supabase, placa)
    const juicios = await loadJuiciosForOwner({
      cedula: owner.cedula,
      ownerName: owner.ownerName || data.lookup?.ownerName,
    })
    return NextResponse.json({ data: attachJuiciosToContraste(data, juicios) })
  } catch (e) {
    if (e instanceof EcuadorApiError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.httpStatus >= 400 && e.httpStatus < 600 ? e.httpStatus : 502 }
      )
    }
    const message = e instanceof Error ? e.message : 'No se pudo consultar EcuadorAPI'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ placa: string }> }
) {
  const { placa } = await context.params
  return handleContraste(placa)
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ placa: string }> }
) {
  const { placa } = await context.params
  return handleContraste(placa)
}
