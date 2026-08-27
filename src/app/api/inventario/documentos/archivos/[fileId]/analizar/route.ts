import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { INVENTORY_VEHICLE_DOCS_BUCKET } from '@/lib/inventario/vehicleDocumentCatalog'
import { analyzeDocumentFileWithOpenAI } from '@/lib/inventario/openaiDocumentVision'
import { buildContrasteAiContext } from '@/lib/inventario/documentAiRules'
import { listContrasteConsultas, payloadFromConsulta } from '@/services/contrasteConsultas.service'
import { getLatestDocumentAiReport, saveDocumentAiReport } from '@/services/documentAiReports.service'

export const maxDuration = 60

type FileContext = {
  file: {
    id: string
    document_id: string
    file_path: string
    file_url: string
    file_name: string
    mime_type: string | null
  }
  document: {
    id: string
    doc_type: string
    inventoryoracle_id: string
  }
  placa: string | null
}

async function loadFileContext(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  fileId: string
): Promise<FileContext | NextResponse> {
  const { data: file, error: fileErr } = await supabase
    .from('inventory_vehicle_document_files')
    .select('id, document_id, file_path, file_url, file_name, mime_type')
    .eq('id', fileId)
    .maybeSingle()
  if (fileErr) return NextResponse.json({ error: fileErr.message }, { status: 500 })
  if (!file) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const { data: document, error: docErr } = await supabase
    .from('inventory_vehicle_documents')
    .select('id, doc_type, inventoryoracle_id')
    .eq('id', file.document_id)
    .maybeSingle()
  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const { data: vehicle } = await supabase
    .from('inventoryoracle')
    .select('plate')
    .eq('id', document.inventoryoracle_id)
    .maybeSingle()

  return { file, document, placa: vehicle?.plate ?? null }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const report = await getLatestDocumentAiReport(supabase, fileId)
    return NextResponse.json({ report })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo leer el reporte'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const loaded = await loadFileContext(supabase, fileId)
  if (loaded instanceof NextResponse) return loaded
  const { file, document, placa } = loaded

  try {
    const downloaded = await supabase.storage.from(INVENTORY_VEHICLE_DOCS_BUCKET).download(file.file_path)
    let bytes: Uint8Array
    if (downloaded.data && !downloaded.error) {
      bytes = new Uint8Array(await downloaded.data.arrayBuffer())
    } else {
      const fallback = await fetch(file.file_url)
      if (!fallback.ok) throw new Error('No se pudo leer el archivo del storage')
      bytes = new Uint8Array(await fallback.arrayBuffer())
    }

    const latestConsulta = placa ? (await listContrasteConsultas(supabase, placa))[0] ?? null : null
    const contraste = buildContrasteAiContext(
      latestConsulta ? payloadFromConsulta(latestConsulta) : null,
      latestConsulta?.created_at ?? null
    )

    const { analysis, model } = await analyzeDocumentFileWithOpenAI({
      bytes,
      mime: file.mime_type || 'application/octet-stream',
      fileName: file.file_name,
      docType: document.doc_type,
      placa,
      contraste,
    })

    const report = await saveDocumentAiReport(supabase, {
      fileId: file.id,
      documentId: document.id,
      inventoryoracleId: document.inventoryoracle_id,
      docType: document.doc_type,
      placa,
      model,
      analysis,
      createdBy: user.id,
    })

    return NextResponse.json({ report })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo analizar el archivo'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
