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

async function persistEmov(
  supabase: SupabaseClient<Database>,
  row: ContrasteConsultaRow,
  payload: NonNullable<ReturnType<typeof payloadFromConsulta>>,
  next: EmovSnapshot,
  previousEstado?: string
): Promise<ContrasteConsultaRow> {
  const updated = { ...payload, emov: next }
  const summary = summarizeMatrix(
    buildContrastMatrix(updated, (row.staff_snapshot as ContrastStaffByDoc) || emptyContrasteStaff()),
    contrastShowAmt(updated)
  )
  const { data: visible } = await supabase.from('inventory_vehicle_contraste_consultas').select('id').eq('id', row.id).maybeSingle()
  if (!visible) return row
  let query = createServiceRoleClient()
    .from('inventory_vehicle_contraste_consultas')
    .update({
      payload: updated as unknown as Json,
      coinciden: summary.coinciden,
      diferencias: summary.diferencias,
      sin_verificar: summary.sinVerificar,
      estado_general: summary.estadoGeneral,
    })
    .eq('id', row.id)
  if (previousEstado) query = query.eq('payload->emov->>estado', previousEstado)
  const { data, error } = await query.select('*').maybeSingle()
  if (error) throw new Error('No se pudo guardar el resultado EMOV.')
  if (data) return data
  const { data: latest } = await supabase.from('inventory_vehicle_contraste_consultas').select('*').eq('id', row.id).maybeSingle()
  return latest || row
}

export async function findActiveEmovConsulta(
  supabase: SupabaseClient<Database>
): Promise<ContrasteConsultaRow | null> {
  const { data, error } = await supabase
    .from('inventory_vehicle_contraste_consultas')
    .select('*')
    .or(
      'payload->emov->>estado.eq.pendiente,payload->emov->>estado.eq.en_proceso,payload->emov->>estado.eq.esperando_intervencion'
    )
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = data?.[0] ?? null
  if (!row) return null
  return emovActive(payloadFromConsulta(row)?.emov) ? row : null
}

export async function attachEmovToConsulta(
  supabase: SupabaseClient<Database>,
  row: ContrasteConsultaRow,
  userId: string
): Promise<{ row: ContrasteConsultaRow; busyPlate?: string }> {
  const payload = payloadFromConsulta(row)
  if (!payload) throw new Error('Esa consulta no tiene datos para EMOV.')
  const active = await findActiveEmovConsulta(supabase)
  const activePlate = active ? payloadFromConsulta(active)?.plate || active.placa : null
  if (active && activePlate && activePlate !== payload.plate) {
    return { row: active, busyPlate: activePlate }
  }
  if (emovActive(payload.emov)) return { row }
  const emov = await startEmov(payload.plate, userId)
  const saved = await persistEmov(supabase, row, payload, emov)
  return { row: saved }
}

export async function refreshEmov(supabase: SupabaseClient<Database>, row: ContrasteConsultaRow): Promise<ContrasteConsultaRow> {
  const payload = payloadFromConsulta(row)
  const current = payload?.emov
  if (!payload || !emovActive(current) || !current?.jobId || !row.consulted_by) return row
  let next: EmovSnapshot
  try {
    const response = await emovRequest(`/consultas/${current.jobId}`, row.consulted_by)
    if (response.status === 404) {
      return persistEmov(
        supabase,
        row,
        payload,
        {
          ...current,
          estado: 'error',
          error: 'La consulta EMOV expiró o ya no está en el servidor. Vuelve a consultar.',
          actualizadoEn: new Date().toISOString(),
        },
        current.estado
      )
    }
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
  return persistEmov(supabase, row, payload, next, current.estado)
}
