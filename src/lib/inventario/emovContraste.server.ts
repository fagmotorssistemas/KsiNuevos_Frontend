import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { emovRequest, EMOV_ID } from '@/lib/emov'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { emovActive, emovResult, type EmovSnapshot } from './emovResult'
import { buildContrastMatrix, contrastShowAmt, emptyContrasteStaff, summarizeMatrix, type ContrastStaffByDoc } from './ecuadorContraste'
import { payloadFromConsulta, type ContrasteConsultaRow } from '@/services/contrasteConsultas.service'

export async function startEmov(plate: string, userId: string | null): Promise<EmovSnapshot> {
  const base: EmovSnapshot = { estado: 'error', actualizadoEn: new Date().toISOString(), total: null, conceptos: [] }
  if (!userId) return { ...base, error: 'No se identificó al usuario de la consulta.' }
  try {
    const response = await emovRequest('/consultas', userId, { tipo: 'placa_chasis_ramv', valor: plate })
    const body = await response.json()
    if (!response.ok) return { ...base, error: body.error }
    if (!EMOV_ID.test(body.id) || body.valor !== plate) throw new Error('Respuesta de consulta inválida.')
    return { ...base, jobId: body.id, estado: body.estado }
  } catch {
    return { ...base, error: 'No se pudo iniciar EMOV. Vuelve a consultar.' }
  }
}

export async function refreshEmov(supabase: SupabaseClient<Database>, row: ContrasteConsultaRow): Promise<ContrasteConsultaRow> {
  const payload = payloadFromConsulta(row)
  const current = payload?.emov
  if (!payload || !emovActive(current) || !current?.jobId || !row.consulted_by) return row
  let next: EmovSnapshot
  try {
    const response = await emovRequest(`/consultas/${current.jobId}`, row.consulted_by)
    if (!response.ok) return row
    const status = await response.json()
    if (status.valor !== payload.plate) return row
    next = { ...current, estado: status.estado, error: status.error, actualizadoEn: status.actualizado_en }
    if (status.estado === 'completada') {
      const result = await emovRequest(`/consultas/${current.jobId}/resultado`, row.consulted_by)
      if (!result.ok) return row
      try {
        next = emovResult(await result.json(), payload.plate, current.jobId)
      } catch {
        next = { ...current, estado: 'error', error: 'EMOV devolvió un resultado inválido. Vuelve a consultar.' }
      }
    }
  } catch {
    return row
  }
  if (JSON.stringify(next) === JSON.stringify(current)) return row
  const updated = { ...payload, emov: next }
  const summary = summarizeMatrix(buildContrastMatrix(updated, (row.staff_snapshot as ContrastStaffByDoc) || emptyContrasteStaff()), contrastShowAmt(updated))
  // Recheck visibility with the authenticated client before the narrowly scoped service-role update.
  const { data: visible } = await supabase.from('inventory_vehicle_contraste_consultas').select('id').eq('id', row.id).maybeSingle()
  if (!visible) return row
  const { data, error } = await createServiceRoleClient().from('inventory_vehicle_contraste_consultas').update({
    payload: updated as unknown as Json,
    coinciden: summary.coinciden, diferencias: summary.diferencias,
    sin_verificar: summary.sinVerificar, estado_general: summary.estadoGeneral,
  }).eq('id', row.id).eq('payload->emov->>estado', current.estado).select('*').maybeSingle()
  if (error) throw new Error('No se pudo guardar el resultado EMOV.')
  if (data) return data
  const { data: latest } = await supabase.from('inventory_vehicle_contraste_consultas').select('*').eq('id', row.id).maybeSingle()
  return latest || row
}
