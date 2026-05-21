import type { SupabaseClient } from '@supabase/supabase-js'
import { CLIENTE_INTERNO_FAG_ID } from '@/components/features/taller/expedientes/ExpedientesTopBar'
import { normalizePlate } from '@/lib/inventario/normalizePlate'

export type ExpedienteVinculo = {
  ordenId: string
  numeroOrden: number
  placa: string
  marca: string | null
  modelo: string | null
  estado: string | null
}

/**
 * Busca el expediente de taller (Fabian Aguirre / cliente interno FAG) cuya placa coincide.
 * Si hay varios, devuelve el más reciente por fecha de ingreso.
 */
export async function findExpedienteFagByPlate(
  supabase: SupabaseClient,
  placa: string
): Promise<ExpedienteVinculo | null> {
  const target = normalizePlate(placa)
  if (!target) return null

  const { data, error } = await supabase
    .from('taller_ordenes')
    .select('id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo, estado, fecha_ingreso')
    .eq('cliente_id', CLIENTE_INTERNO_FAG_ID)
    .order('fecha_ingreso', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[expedienteVinculo] find by plate', error)
    return null
  }

  const match = (data ?? []).find((o) => normalizePlate(o.vehiculo_placa ?? '') === target)
  if (!match) return null

  return {
    ordenId: match.id,
    numeroOrden: match.numero_orden,
    placa: match.vehiculo_placa,
    marca: match.vehiculo_marca,
    modelo: match.vehiculo_modelo,
    estado: match.estado,
  }
}

export async function fetchExpedienteOrdenById(
  supabase: SupabaseClient,
  ordenId: string
): Promise<{ orden: Record<string, unknown> | null; error?: string }> {
  const { data, error } = await supabase
    .from('taller_ordenes')
    .select(
      `
      *,
      cliente:taller_clientes(nombre_completo, telefono, email, cedula_ruc, direccion),
      transacciones:taller_transacciones(*)
    `
    )
    .eq('id', ordenId)
    .single()

  if (error) return { orden: null, error: error.message }
  return { orden: data as Record<string, unknown> }
}
