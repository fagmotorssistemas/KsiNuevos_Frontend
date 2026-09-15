import { refreshEmov } from '@/lib/inventario/emovContraste.server'
import { emovText } from '@/lib/inventario/emovResult'
import { listContrasteConsultas, payloadFromConsulta } from '@/services/contrasteConsultas.service'
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
    const latest = (await listContrasteConsultas(supabase, placa))[0]
    const official = latest ? payloadFromConsulta(await refreshEmov(supabase, latest)) : null
    const emovItem: VehicleAiSynthesisItem = {
      docType: 'emov_consulta_oficial', docLabel: 'Consulta oficial EMOV Cuenca', fileName: 'Fuente oficial EMOV',
      summary: emovText(official?.emov),
      issues: official?.emov?.estado === 'completada' && official.emov.total !== null ? (official.emov.total > 0 ? ['EMOV reporta valores pendientes; revisar cada concepto.'] : []) : ['EMOV no está verificada: no concluir que el vehículo está libre de deudas.'],
      detailText: 'Presentar todos los conceptos EMOV. El total ya contiene esos conceptos: no sumarlos dos veces. No acumular con ANT sin verificar si corresponden a las mismas obligaciones. ATM es distinta de AMT y debe analizarse como documento separado.',
    }
    const synthesis = await synthesizeVehicleAiReport({
      placa,
      vehicleLabel: body.vehicleLabel?.trim() || placa,
      items: [...items.filter(item => item.docType !== 'emov_consulta_oficial').slice(0, 39), emovItem],
    })
    return NextResponse.json({ synthesis })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo generar el informe IA'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
