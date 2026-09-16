import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchAntSnapshot, mergeAntIntoContrastePayload, EcuadorApiError } from '@/lib/inventario/ecuador-api'
import {
  buildContrastMatrix,
  contrastShowAmt,
  emptyContrasteStaff,
  payloadMissingAnt,
  summarizeMatrix,
  type ContrastStaffByDoc,
} from '@/lib/inventario/ecuadorContraste'
import { payloadFromConsulta, type ContrasteConsultaRow } from '@/services/contrasteConsultas.service'

export type AntBackfillItem = {
  placa: string
  status: 'updated' | 'skipped' | 'error'
  error?: string
  pendingTotal?: number | null
}

const BATCH = 1

export async function backfillMissingAnt(
  supabase: SupabaseClient<Database>,
  input?: { excludePlates?: string[] }
): Promise<{ results: AntBackfillItem[]; remaining: number }> {
  const exclude = new Set((input?.excludePlates ?? []).map((p) => p.toUpperCase()))
  const latest = (await listLatestMissingAnt(supabase)).filter((row) => !exclude.has(row.placa.toUpperCase()))
  const batch = latest.slice(0, BATCH)
  const results: AntBackfillItem[] = []

  for (const row of batch) {
    const payload = payloadFromConsulta(row)
    const placa = payload?.plate || row.placa
    if (!payload?.lookup) {
      results.push({ placa, status: 'error', error: 'Consulta sin datos de placa' })
      continue
    }
    if (!payloadMissingAnt(payload)) {
      results.push({ placa, status: 'skipped' })
      continue
    }
    try {
      const snap = await fetchAntSnapshot(placa, payload.lookup.ownerIdAnt || payload.lookup.ownerIdSri)
      if (snap.historyStatus !== 'ok' && !snap.ant && (snap.citations?.length ?? 0) === 0) {
        if (!snap.historyStatus) {
          results.push({ placa, status: 'error', error: 'ANT no respondió' })
          continue
        }
      }
      const next = mergeAntIntoContrastePayload(payload, snap)
      const staff = (row.staff_snapshot as ContrastStaffByDoc) || emptyContrasteStaff()
      const summary = summarizeMatrix(buildContrastMatrix(next, staff), contrastShowAmt(next))
      const { data: visible } = await supabase
        .from('inventory_vehicle_contraste_consultas')
        .select('id')
        .eq('id', row.id)
        .maybeSingle()
      if (!visible) {
        results.push({ placa, status: 'error', error: 'Sin permiso para actualizar' })
        continue
      }
      const { error } = await createServiceRoleClient()
        .from('inventory_vehicle_contraste_consultas')
        .update({
          payload: next as unknown as Json,
          coinciden: summary.coinciden,
          diferencias: summary.diferencias,
          sin_verificar: summary.sinVerificar,
          estado_general: summary.estadoGeneral,
        })
        .eq('id', row.id)
      if (error) {
        results.push({ placa, status: 'error', error: 'No se pudo guardar ANT' })
        continue
      }
      results.push({
        placa,
        status: 'updated',
        pendingTotal: next.citationsPendingTotal ?? next.ant?.total ?? 0,
      })
    } catch (error) {
      if (error instanceof EcuadorApiError && (error.httpStatus === 401 || error.httpStatus === 402)) throw error
      results.push({
        placa,
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al consultar ANT',
      })
    }
  }

  return { results, remaining: Math.max(0, latest.length - batch.length) }
}

async function listLatestMissingAnt(
  supabase: SupabaseClient<Database>
): Promise<ContrasteConsultaRow[]> {
  const { data, error } = await supabase
    .from('inventory_vehicle_contraste_consultas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(800)
  if (error) throw error
  const latest = new Map<string, ContrasteConsultaRow>()
  for (const row of data ?? []) {
    const plate = (row.placa || '').toUpperCase()
    if (!plate || latest.has(plate)) continue
    latest.set(plate, row)
  }
  return [...latest.values()].filter((row) => payloadMissingAnt(payloadFromConsulta(row)))
}
