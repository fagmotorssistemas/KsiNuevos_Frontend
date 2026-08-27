import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import type { DocumentAiAnalysis } from '@/lib/inventario/openaiDocumentVision'

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
