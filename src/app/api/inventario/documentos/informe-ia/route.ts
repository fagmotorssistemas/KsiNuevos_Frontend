import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizePlate } from '@/lib/inventario/normalizePlate'
import {
  getLatestVehicleAiInforme,
  saveVehicleAiInforme,
  type VehicleAiInformePayload,
} from '@/services/vehicleAiInformes.service'

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const placa = normalizePlate(new URL(req.url).searchParams.get('placa') ?? '')
  if (!placa) return NextResponse.json({ error: 'Falta la placa' }, { status: 400 })

  try {
    const informe = await getLatestVehicleAiInforme(supabase, placa)
    return NextResponse.json({ informe })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo leer el informe IA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = (await req.json()) as {
    placa?: string
    inventoryoracleId?: string | null
    payload?: VehicleAiInformePayload
  }
  const placa = normalizePlate(body.placa ?? '')
  if (!placa) return NextResponse.json({ error: 'Falta la placa' }, { status: 400 })
  if (!body.payload?.synthesis || !Array.isArray(body.payload.sections)) {
    return NextResponse.json({ error: 'Informe incompleto' }, { status: 400 })
  }

  try {
    const informe = await saveVehicleAiInforme(supabase, {
      placa,
      inventoryoracleId: body.inventoryoracleId ?? null,
      payload: body.payload,
      createdBy: user.id,
    })
    return NextResponse.json({ informe })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo guardar el informe IA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
