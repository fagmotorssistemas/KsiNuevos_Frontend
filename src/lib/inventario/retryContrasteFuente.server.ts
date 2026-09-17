import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  fetchAntSnapshot,
  mergeAntIntoContrastePayload,
  mergeSriIntoContrastePayload,
  refetchPendientes,
} from '@/lib/inventario/ecuador-api'
import {
  buildContrastMatrix,
  contrastShowAmt,
  emptyContrasteStaff,
  type ContrastStaffByDoc,
  type EcuadorContrastePayload,
  summarizeMatrix,
} from '@/lib/inventario/ecuadorContraste'
import { payloadFromConsulta, type ContrasteConsultaRow } from '@/services/contrasteConsultas.service'

export type ContrasteFuente = 'ant' | 'sri'

export async function retryContrasteFuente(
  supabase: SupabaseClient<Database>,
  placa: string,
  fuente: ContrasteFuente,
  consultaId?: string | null
): Promise<{ row: ContrasteConsultaRow; data: EcuadorContrastePayload }> {
  let row: ContrasteConsultaRow | null = null
  if (consultaId) {
    const { data, error } = await supabase
      .from('inventory_vehicle_contraste_consultas')
      .select('*')
      .eq('id', consultaId)
      .eq('placa', placa)
      .maybeSingle()
    if (error) throw new Error('No se pudo leer el historial')
    row = data
  }
  if (!row) {
    const { data, error } = await supabase
      .from('inventory_vehicle_contraste_consultas')
      .select('*')
      .eq('placa', placa)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error('No se pudo leer el historial')
    row = data
  }
  if (!row) throw new Error('Primero consulta SRI / ANT con Consultar nuevamente.')
  const payload = payloadFromConsulta(row)
  if (!payload?.lookup) throw new Error('Esa consulta no tiene datos para reintentar.')

  const next =
    fuente === 'ant'
      ? mergeAntIntoContrastePayload(
          payload,
          await fetchAntSnapshot(placa, payload.lookup.ownerIdAnt || payload.lookup.ownerIdSri, {
            bypassCache: true,
          })
        )
      : mergeSriIntoContrastePayload(payload, await refetchPendientes(placa, 'sri'))

  const staff = (row.staff_snapshot as ContrastStaffByDoc) || emptyContrasteStaff()
  const summary = summarizeMatrix(buildContrastMatrix(next, staff), contrastShowAmt(next))
  const { data: visible } = await supabase.from('inventory_vehicle_contraste_consultas').select('id').eq('id', row.id).maybeSingle()
  if (!visible) throw new Error('Sin permiso para actualizar esa consulta.')

  const { data: saved, error: saveError } = await createServiceRoleClient()
    .from('inventory_vehicle_contraste_consultas')
    .update({
      payload: next as unknown as Json,
      coinciden: summary.coinciden,
      diferencias: summary.diferencias,
      sin_verificar: summary.sinVerificar,
      estado_general: summary.estadoGeneral,
    })
    .eq('id', row.id)
    .select('*')
    .single()
  if (saveError || !saved) throw new Error('No se pudo guardar el reintento.')
  return { row: saved, data: next }
}
