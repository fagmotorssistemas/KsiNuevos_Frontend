import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import type { EcuadorContrastePayload, ContrasteEstadoGeneral, OfficialPendingSummary } from '@/lib/inventario/ecuadorContraste'
import { officialPendingSummary } from '@/lib/inventario/ecuadorContraste'
import { normalizePlate } from '@/lib/inventario/normalizePlate'

export type ContrasteConsultaRow = Database['public']['Tables']['inventory_vehicle_contraste_consultas']['Row']

type StaffSnapshot = Json

export async function listContrasteConsultas(
  supabase: SupabaseClient<Database>,
  placa: string
): Promise<ContrasteConsultaRow[]> {
  const plate = normalizePlate(placa)
  if (!plate) return []
  const { data, error } = await supabase
    .from('inventory_vehicle_contraste_consultas')
    .select('*')
    .eq('placa', plate)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function saveContrasteConsulta(
  supabase: SupabaseClient<Database>,
  input: {
    placa: string
    inventoryoracleId: string | null
    payload: EcuadorContrastePayload
    staffSnapshot: StaffSnapshot
    coinciden: number
    diferencias: number
    sinVerificar: number
    estadoGeneral: ContrasteEstadoGeneral
    consultedBy: string | null
    consultedByName: string
  }
): Promise<ContrasteConsultaRow> {
  const { data, error } = await supabase
    .from('inventory_vehicle_contraste_consultas')
    .insert({
      placa: normalizePlate(input.placa),
      inventoryoracle_id: input.inventoryoracleId,
      payload: input.payload as unknown as Json,
      staff_snapshot: input.staffSnapshot,
      coinciden: input.coinciden,
      diferencias: input.diferencias,
      sin_verificar: input.sinVerificar,
      estado_general: input.estadoGeneral,
      consulted_by: input.consultedBy,
      consulted_by_name: input.consultedByName,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

const PLATE_IN_CHUNK = 80

export type LatestContrasteByPlate = {
  consultedAt: string
  pending: OfficialPendingSummary
}

/** Última consulta EcuadorAPI por placa (no llama a la API; solo lee historial guardado). */
export async function listLatestContrasteConsultasByPlacas(
  supabase: SupabaseClient<Database>,
  placas: string[]
): Promise<Map<string, LatestContrasteByPlate>> {
  const unique = [...new Set(placas.map((p) => normalizePlate(p)).filter(Boolean))]
  const latest = new Map<string, { created_at: string; payload: Json | null }>()
  for (let i = 0; i < unique.length; i += PLATE_IN_CHUNK) {
    const chunk = unique.slice(i, i + PLATE_IN_CHUNK)
    const { data, error } = await supabase
      .from('inventory_vehicle_contraste_consultas')
      .select('placa, created_at, payload')
      .in('placa', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      const plate = normalizePlate(row.placa)
      const prev = latest.get(plate)
      if (!prev || row.created_at > prev.created_at) {
        latest.set(plate, { created_at: row.created_at, payload: row.payload })
      }
    }
  }
  const out = new Map<string, LatestContrasteByPlate>()
  for (const [plate, row] of latest) {
    const parsed = payloadFromConsulta({ payload: row.payload } as ContrasteConsultaRow)
    out.set(plate, {
      consultedAt: row.created_at,
      pending: officialPendingSummary(parsed),
    })
  }
  return out
}

export function payloadFromConsulta(row: ContrasteConsultaRow): EcuadorContrastePayload | null {
  const p = row.payload
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null
  const payload = p as unknown as EcuadorContrastePayload
  if (!payload.plate) return null
  if (!payload.matricula && !payload.lookup) return null
  return payload
}

export async function hasContrasteConsulta(
  supabase: SupabaseClient<Database>,
  placa: string
): Promise<boolean> {
  const plate = normalizePlate(placa)
  if (!plate) return false
  const { data, error } = await supabase
    .from('inventory_vehicle_contraste_consultas')
    .select('id')
    .eq('placa', plate)
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}
