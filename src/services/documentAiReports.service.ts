import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import type { DocumentAiAnalysis } from '@/lib/inventario/openaiDocumentVision'
import { analysisFailsAiApproval } from '@/lib/inventario/documentAiRules'
import { getLatestVehicleAiInforme, parseVehicleAiInformePayload } from '@/services/vehicleAiInformes.service'

export type DocumentAiReportRow = Database['public']['Tables']['inventory_vehicle_document_ai_reports']['Row']

export async function getLatestDocumentAiReport(
  supabase: SupabaseClient<Database>,
  fileId: string
): Promise<DocumentAiReportRow | null> {
  const { data, error } = await supabase
    .from('inventory_vehicle_document_ai_reports')
    .select('*')
    .eq('file_id', fileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveDocumentAiReport(
  supabase: SupabaseClient<Database>,
  input: {
    fileId: string
    documentId: string
    inventoryoracleId: string | null
    docType: string
    placa: string | null
    model: string
    analysis: DocumentAiAnalysis
    createdBy: string | null
  }
): Promise<DocumentAiReportRow> {
  const { data, error } = await supabase
    .from('inventory_vehicle_document_ai_reports')
    .insert({
      file_id: input.fileId,
      document_id: input.documentId,
      inventoryoracle_id: input.inventoryoracleId,
      doc_type: input.docType,
      placa: input.placa,
      model: input.model,
      summary: input.analysis.summary,
      extracted: input.analysis.extracted as unknown as Json,
      quality: input.analysis.quality,
      matches_plate: input.analysis.matches_plate,
      payload: input.analysis as unknown as Json,
      created_by: input.createdBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export function reportFailsAiApproval(report: DocumentAiReportRow): boolean {
  if (report.quality === 'wrong_document' || report.quality === 'unreadable') return true
  if (report.matches_plate === false) return true
  const payload = report.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return analysisFailsAiApproval(payload as DocumentAiAnalysis)
  }
  return false
}

/** True si alguna foto vigente del expediente fue rechazada por la IA (informe o análisis por archivo). */
export async function vehicleDocsFailAiApproval(
  supabase: SupabaseClient<Database>,
  input: {
    placa: string
    inventoryoracleId: string | null
    fileIds: string[]
  }
): Promise<boolean> {
  const current = new Set(input.fileIds.filter((id) => id && !id.startsWith('legacy-')))
  if (current.size === 0) return false

  const latest = new Map<string, { at: number; rejected: boolean }>()
  const consider = (fileId: string, at: string, rejected: boolean) => {
    if (!current.has(fileId)) return
    const ts = new Date(at).getTime()
    const prev = latest.get(fileId)
    if (!prev || ts >= prev.at) latest.set(fileId, { at: ts, rejected })
  }

  try {
    const informe = await getLatestVehicleAiInforme(supabase, input.placa)
    const parsed = informe ? parseVehicleAiInformePayload(informe.payload) : null
    if (informe && parsed) {
      for (const section of parsed.sections) {
        for (const file of section.files) {
          if (!file.fileId) continue
          consider(file.fileId, informe.created_at, analysisFailsAiApproval(file.analysis))
        }
      }
    }
  } catch {
    /* el informe no bloquea el KPI si falla la lectura */
  }

  if (input.inventoryoracleId) {
    const { data, error } = await supabase
      .from('inventory_vehicle_document_ai_reports')
      .select('*')
      .eq('inventoryoracle_id', input.inventoryoracleId)
      .order('created_at', { ascending: false })
    if (!error) {
      for (const row of data ?? []) {
        consider(row.file_id, row.created_at, reportFailsAiApproval(row))
      }
    }
  }

  return [...latest.values()].some((item) => item.rejected)
}
