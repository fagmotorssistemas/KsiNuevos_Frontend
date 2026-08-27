import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { synthesizeVehicleAiReport, type VehicleAiSynthesisItem } from '@/lib/inventario/openaiDocumentVision'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = (await req.json()) as {
    placa?: string
    vehicleLabel?: string
    items?: VehicleAiSynthesisItem[]
  }
  const placa = body.placa?.trim()
  const items = Array.isArray(body.items) ? body.items : []
  if (!placa) return NextResponse.json({ error: 'Falta la placa' }, { status: 400 })
  if (items.length === 0) {
    return NextResponse.json({ error: 'No hay análisis para sintetizar' }, { status: 400 })
  }

  try {
    const synthesis = await synthesizeVehicleAiReport({
      placa,
      vehicleLabel: body.vehicleLabel?.trim() || placa,
      items: items.slice(0, 40),
    })
    return NextResponse.json({ synthesis })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo generar el informe IA'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
