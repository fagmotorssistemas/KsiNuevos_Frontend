import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { normalizePlate } from '@/lib/inventario/normalizePlate'
import { normalizeFindings, type DocumentAiAnalysis, type VehicleAiSynthesis } from '@/lib/inventario/openaiDocumentVision'

export type VehicleAiInformeRow = Database['public']['Tables']['inventory_vehicle_ai_informes']['Row']

export type VehicleAiInformeSectionFile = {
  fileId: string
  fileName: string
  photoIndex?: number
  error?: string
  analysis?: DocumentAiAnalysis
}

export type VehicleAiInformeSection = {
  docType: string
  docLabel: string
  category: 'legal' | 'physical'
  detailText: string | null
  missing: boolean
  files: VehicleAiInformeSectionFile[]
}

export type VehicleAiInformePayload = {
  synthesis: VehicleAiSynthesis
  sections: VehicleAiInformeSection[]
}

export function payloadFromAiInforme(row: VehicleAiInformeRow): VehicleAiInformePayload | null {
  return parseVehicleAiInformePayload(row.payload)
}

export function parseVehicleAiInformePayload(value: unknown): VehicleAiInformePayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as VehicleAiInformePayload
  if (!payload.synthesis || !Array.isArray(payload.sections)) return null
  return {
    ...payload,
    synthesis: {
      ...payload.synthesis,
      alerts: normalizeFindings(payload.synthesis.alerts),
      blocks: (payload.synthesis.blocks ?? []).map((block) => ({
        ...block,
        alerts: normalizeFindings(block.alerts),
      })),
    },
    sections: payload.sections.map((section) => ({
      ...section,
      files: section.files.map((file, index) => ({
        ...file,
        photoIndex: file.photoIndex ?? index + 1,
      })),
    })),
  }
}

export async function getLatestVehicleAiInforme(
  supabase: SupabaseClient<Database>,
  placa: string
): Promise<VehicleAiInformeRow | null> {
  const plate = normalizePlate(placa)
  if (!plate) return null
  const { data, error } = await supabase
    .from('inventory_vehicle_ai_informes')
    .select('*')
    .eq('placa', plate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveVehicleAiInforme(
  supabase: SupabaseClient<Database>,
  input: {
    placa: string
    inventoryoracleId: string | null
    payload: VehicleAiInformePayload
    createdBy: string | null
  }
): Promise<VehicleAiInformeRow> {
  const { data, error } = await supabase
    .from('inventory_vehicle_ai_informes')
    .insert({
      placa: normalizePlate(input.placa),
      inventoryoracle_id: input.inventoryoracleId,
      payload: input.payload as unknown as Json,
      created_by: input.createdBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}
