import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import {
  buildContrastMatrix,
  contrastShowAmt,
  emptyContrasteStaff,
  summarizeMatrix,
} from '@/lib/inventario/ecuadorContraste'
import { EcuadorApiError, fetchEcuadorContraste, normalizeConsultaPlaca } from '@/lib/inventario/ecuador-api'
import { attachJuiciosToContraste, loadJuiciosForOwner } from '@/lib/inventario/consultas-ec'
import { hasContrasteConsulta, saveContrasteConsulta } from '@/services/contrasteConsultas.service'
import { resolveOwnerIdentityForContraste } from '@/services/vehicleLegal.service'

export type ContrasteIngresoResult = {
  placa: string
  status: 'saved' | 'skipped' | 'invalid' | 'error'
  error?: string
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runAndSaveContrasteIngreso(
  supabase: SupabaseClient<Database>,
  input: {
    placa: string
    inventoryoracleId: string | null
    consultedBy: string | null
  }
): Promise<ContrasteIngresoResult> {
  const placa = normalizeConsultaPlaca(input.placa)
  if (!placa) {
    return { placa: input.placa, status: 'invalid', error: 'Placa inválida' }
  }

  if (await hasContrasteConsulta(supabase, placa)) {
    return { placa, status: 'skipped' }
  }

  let payload
  try {
    payload = await fetchEcuadorContraste(placa)
  } catch (error) {
    if (error instanceof EcuadorApiError && error.httpStatus === 429) {
      await wait(5000)
      payload = await fetchEcuadorContraste(placa)
    } else {
      throw error
    }
  }

  const owner = await resolveOwnerIdentityForContraste(supabase, placa, input.inventoryoracleId)
  const juicios = await loadJuiciosForOwner({
    cedula: owner.cedula,
    ownerName: owner.ownerName || payload.lookup?.ownerName,
  })
  payload = attachJuiciosToContraste(payload, juicios)

  const staff = emptyContrasteStaff()
  const summary = summarizeMatrix(buildContrastMatrix(payload, staff), contrastShowAmt(payload))
  await saveContrasteConsulta(supabase, {
    placa,
    inventoryoracleId: input.inventoryoracleId,
    payload,
    staffSnapshot: staff as unknown as Json,
    coinciden: summary.coinciden,
    diferencias: summary.diferencias,
    sinVerificar: summary.sinVerificar,
    estadoGeneral: summary.estadoGeneral,
    consultedBy: input.consultedBy,
    consultedByName: 'Ingreso automático',
  })
  return { placa, status: 'saved' }
}
