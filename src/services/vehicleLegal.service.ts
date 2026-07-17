import type { SupabaseClient } from '@supabase/supabase-js'
import {
  INVENTORY_VEHICLE_DOCS_BUCKET,
  VEHICLE_DEBT_CATALOG,
  VEHICLE_DOCUMENT_CATALOG,
} from '@/lib/inventario/vehicleDocumentCatalog'
import type {
  VehicleDebtRow,
  VehicleDocumentFileRow,
  VehicleDocumentRow,
  VehicleEventRow,
  VehicleFineRow,
  VehicleInternalNoteRow,
  VehicleLegalDossier,
  VehicleLegalSummary,
  VehicleOwnerRow,
  VehicleDocStatus,
  VehicleDocType,
  DocumentActivityEntry,
  VehicleDocumentActivityAction,
} from '@/types/vehicleLegal.types'

const ACCEPT_UPLOAD = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

export { ACCEPT_UPLOAD }

import { normalizePlate } from '@/lib/inventario/normalizePlate'
import { documentHasFiles } from '@/lib/inventario/vehicleLegalUi'

export type VehicleLegalChecklistEntry = {
  inventoryoracleId: string | null
  documents: Map<VehicleDocType, VehicleDocumentRow>
  debts: Map<string, VehicleDebtRow>
  pendingFinesCount: number
  totalFinesCount: number
}

export type VehicleLegalChecklistBulk = {
  byPlate: Map<string, VehicleLegalChecklistEntry>
}

const IN_CHUNK = 150
/** PostgREST devuelve como máximo 1000 filas por request si no se pagina */
const SUPABASE_PAGE_SIZE = 1000

async function fetchInChunks<T>(
  ids: string[],
  fetchPage: (chunk: string[], from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK)
    let from = 0
    for (;;) {
      const rows = await fetchPage(chunk, from, from + SUPABASE_PAGE_SIZE - 1)
      out.push(...rows)
      if (rows.length < SUPABASE_PAGE_SIZE) break
      from += SUPABASE_PAGE_SIZE
    }
  }
  return out
}

async function attachDocumentFiles(
  supabase: SupabaseClient,
  documents: VehicleDocumentRow[]
): Promise<VehicleDocumentRow[]> {
  if (documents.length === 0) return documents

  try {
    const docIds = documents.map((d) => d.id)
    const allFiles = await fetchInChunks(docIds, async (chunk, from, to) => {
      const { data, error } = await supabase
        .from('inventory_vehicle_document_files')
        .select('*')
        .in('document_id', chunk)
        .order('created_at', { ascending: true })
        .order('id')
        .range(from, to)
      if (error) throw error
      return (data ?? []) as VehicleDocumentFileRow[]
    })

    const byDoc = new Map<string, VehicleDocumentFileRow[]>()
    for (const file of allFiles) {
      const list = byDoc.get(file.document_id) ?? []
      list.push(file)
      byDoc.set(file.document_id, list)
    }

    return documents.map((doc) => ({
      ...doc,
      files: byDoc.get(doc.id) ?? [],
    }))
  } catch (err) {
    console.warn('[vehicleLegal] attachDocumentFiles fallback', err)
    return documents.map((doc) => ({ ...doc, files: [] }))
  }
}

export async function resolveInventoryOracleId(
  supabase: SupabaseClient,
  placa: string,
  oracleId?: string | null
): Promise<string | null> {
  const plateNorm = normalizePlate(placa)

  const { data: byPlate, error: plateErr } = await supabase
    .from('inventoryoracle')
    .select('id')
    .eq('plate', plateNorm)
    .maybeSingle()

  if (plateErr) console.error('[vehicleLegal] resolve by plate', plateErr)
  if (byPlate?.id) return byPlate.id

  const { data: byShort } = await supabase
    .from('inventoryoracle')
    .select('id')
    .eq('plate_short', plateNorm)
    .maybeSingle()
  if (byShort?.id) return byShort.id

  if (oracleId) {
    const { data: byOracle } = await supabase
      .from('inventoryoracle')
      .select('id')
      .eq('oracle_id', String(oracleId))
      .maybeSingle()
    if (byOracle?.id) return byOracle.id
  }

  return null
}

async function seedDocumentSlots(supabase: SupabaseClient, inventoryoracleId: string) {
  const { data: existing, error: readErr } = await supabase
    .from('inventory_vehicle_documents')
    .select('doc_type')
    .eq('inventoryoracle_id', inventoryoracleId)
  if (readErr) throw readErr

  const have = new Set((existing ?? []).map((r) => r.doc_type))
  const missing = VEHICLE_DOCUMENT_CATALOG.filter((d) => !have.has(d.docType))
  if (missing.length === 0) return

  const { error } = await supabase.from('inventory_vehicle_documents').insert(
    missing.map((d) => ({
      inventoryoracle_id: inventoryoracleId,
      doc_type: d.docType,
      category: d.category,
      status: d.defaultStatus,
    }))
  )
  if (error) throw error
}

async function seedDebtSlots(supabase: SupabaseClient, inventoryoracleId: string) {
  const { data: existing, error: readErr } = await supabase
    .from('inventory_vehicle_debts')
    .select('debt_type')
    .eq('inventoryoracle_id', inventoryoracleId)
  if (readErr) throw readErr

  const have = new Set((existing ?? []).map((r) => r.debt_type))
  const missing = VEHICLE_DEBT_CATALOG.filter((d) => !have.has(d.debtType))
  if (missing.length === 0) return

  const { error } = await supabase.from('inventory_vehicle_debts').insert(
    missing.map((d) => ({
      inventoryoracle_id: inventoryoracleId,
      debt_type: d.debtType,
      status: 'pendiente' as const,
    }))
  )
  if (error) throw error
}

export async function loadBulkVehicleLegalChecklist(
  supabase: SupabaseClient,
  vehicles: { placa: string; proId?: string }[]
): Promise<VehicleLegalChecklistBulk> {
  const byPlate = new Map<string, VehicleLegalChecklistEntry>()
  if (vehicles.length === 0) return { byPlate }

  const plateToNorm = new Map<string, string>()
  for (const v of vehicles) {
    const norm = normalizePlate(v.placa)
    plateToNorm.set(v.placa, norm)
    byPlate.set(norm, {
      inventoryoracleId: null,
      documents: new Map(),
      debts: new Map(),
      pendingFinesCount: 0,
      totalFinesCount: 0,
    })
  }

  const uniqueNorms = [...byPlate.keys()]
  const oracleByNorm = new Map<string, string>()

  for (let i = 0; i < uniqueNorms.length; i += IN_CHUNK) {
    const batch = uniqueNorms.slice(i, i + IN_CHUNK)
    const { data: byPlateRows, error: plateErr } = await supabase
      .from('inventoryoracle')
      .select('id, plate, plate_short, oracle_id')
      .in('plate', batch)
    if (plateErr) throw plateErr
    for (const row of byPlateRows ?? []) {
      const norm = normalizePlate(row.plate ?? '')
      if (norm) oracleByNorm.set(norm, row.id)
      if (row.plate_short) {
        const shortNorm = normalizePlate(row.plate_short)
        if (shortNorm) oracleByNorm.set(shortNorm, row.id)
      }
    }
  }

  const proIds = [...new Set(vehicles.map((v) => v.proId?.toString()).filter(Boolean) as string[])]
  if (proIds.length > 0) {
    for (let i = 0; i < proIds.length; i += IN_CHUNK) {
      const batch = proIds.slice(i, i + IN_CHUNK)
      const { data: byOracleRows, error: oracleErr } = await supabase
        .from('inventoryoracle')
        .select('id, plate, plate_short, oracle_id')
        .in('oracle_id', batch)
      if (oracleErr) throw oracleErr
      for (const row of byOracleRows ?? []) {
        const norm = normalizePlate(row.plate ?? '')
        if (norm) oracleByNorm.set(norm, row.id)
      }
    }
  }

  for (const [norm, entry] of byPlate) {
    const id = oracleByNorm.get(norm) ?? null
    entry.inventoryoracleId = id
  }

  const oracleIds = [...new Set([...oracleByNorm.values()])]
  if (oracleIds.length === 0) return { byPlate }

  const [allDocs, allDebts, allFines] = await Promise.all([
    fetchInChunks(oracleIds, async (chunk, from, to) => {
      const { data, error } = await supabase
        .from('inventory_vehicle_documents')
        .select('*')
        .in('inventoryoracle_id', chunk)
        .order('id')
        .range(from, to)
      if (error) throw error
      return (data ?? []) as VehicleDocumentRow[]
    }),
    fetchInChunks(oracleIds, async (chunk, from, to) => {
      const { data, error } = await supabase
        .from('inventory_vehicle_debts')
        .select('*')
        .in('inventoryoracle_id', chunk)
        .order('id')
        .range(from, to)
      if (error) throw error
      return (data ?? []) as VehicleDebtRow[]
    }),
    fetchInChunks(oracleIds, async (chunk, from, to) => {
      const { data, error } = await supabase
        .from('inventory_vehicle_fines')
        .select('inventoryoracle_id, status')
        .in('inventoryoracle_id', chunk)
        .order('id')
        .range(from, to)
      if (error) throw error
      return data ?? []
    }),
  ])

  const idToEntry = new Map<string, VehicleLegalChecklistEntry>()
  for (const entry of byPlate.values()) {
    if (entry.inventoryoracleId) {
      idToEntry.set(entry.inventoryoracleId, entry)
    }
  }

  const enrichedDocs = await attachDocumentFiles(supabase, allDocs)
  for (const doc of enrichedDocs) {
    const entry = idToEntry.get(doc.inventoryoracle_id)
    if (entry) entry.documents.set(doc.doc_type, doc)
  }

  for (const debt of allDebts) {
    const entry = idToEntry.get(debt.inventoryoracle_id)
    if (entry) entry.debts.set(debt.debt_type, debt)
  }

  for (const fine of allFines) {
    const entry = idToEntry.get(fine.inventoryoracle_id)
    if (!entry) continue
    entry.totalFinesCount += 1
    if (fine.status === 'pendiente') entry.pendingFinesCount += 1
  }

  return { byPlate }
}

export async function loadVehicleLegalDossier(
  supabase: SupabaseClient,
  placa: string,
  oracleId?: string | null
): Promise<VehicleLegalDossier> {
  const inventoryoracleId = await resolveInventoryOracleId(supabase, placa, oracleId)
  if (!inventoryoracleId) {
    return {
      inventoryoracleId: null,
      documents: [],
      fines: [],
      debts: [],
      owners: [],
      events: [],
      notes: [],
    }
  }

  await seedDocumentSlots(supabase, inventoryoracleId)
  await seedDebtSlots(supabase, inventoryoracleId)

  const [docsRes, finesRes, debtsRes, ownersRes, eventsRes, notesRes] = await Promise.all([
    supabase
      .from('inventory_vehicle_documents')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('category')
      .order('doc_type'),
    supabase
      .from('inventory_vehicle_fines')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('fine_date', { ascending: false }),
    supabase.from('inventory_vehicle_debts').select('*').eq('inventoryoracle_id', inventoryoracleId),
    supabase
      .from('inventory_vehicle_owners')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('sort_order')
      .order('is_current', { ascending: false }),
    supabase
      .from('inventory_vehicle_events')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('event_date', { ascending: false }),
    supabase
      .from('inventory_vehicle_internal_notes')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('created_at', { ascending: false }),
  ])

  const queryError =
    docsRes.error?.message ||
    finesRes.error?.message ||
    debtsRes.error?.message ||
    ownersRes.error?.message ||
    eventsRes.error?.message ||
    notesRes.error?.message
  if (queryError) throw new Error(queryError)

  const documents = (docsRes.data ?? []) as VehicleDocumentRow[]
  if (documents.length < VEHICLE_DOCUMENT_CATALOG.length) {
    await seedDocumentSlots(supabase, inventoryoracleId)
    const { data: retryDocs, error: retryErr } = await supabase
      .from('inventory_vehicle_documents')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .order('category')
      .order('doc_type')
    if (retryErr) throw retryErr
    const withFiles = await attachDocumentFiles(supabase, (retryDocs ?? []) as VehicleDocumentRow[])
    return {
      inventoryoracleId,
      documents: withFiles,
      fines: (finesRes.data ?? []) as VehicleFineRow[],
      debts: (debtsRes.data ?? []) as VehicleDebtRow[],
      owners: (ownersRes.data ?? []) as VehicleOwnerRow[],
      events: (eventsRes.data ?? []) as VehicleEventRow[],
      notes: (notesRes.data ?? []) as VehicleInternalNoteRow[],
    }
  }

  const withFiles = await attachDocumentFiles(supabase, documents)
  return {
    inventoryoracleId,
    documents: withFiles,
    fines: (finesRes.data ?? []) as VehicleFineRow[],
    debts: (debtsRes.data ?? []) as VehicleDebtRow[],
    owners: (ownersRes.data ?? []) as VehicleOwnerRow[],
    events: (eventsRes.data ?? []) as VehicleEventRow[],
    notes: (notesRes.data ?? []) as VehicleInternalNoteRow[],
  }
}

export function computeLegalSummary(dossier: VehicleLegalDossier): VehicleLegalSummary {
  const required = VEHICLE_DOCUMENT_CATALOG.filter((d) => d.requiresFile)
  const docsTotal = required.length
  const docsComplete = dossier.documents.filter(
    (d) =>
      required.some((r) => r.docType === d.doc_type) &&
      (d.status === 'cargado' ||
        d.status === 'vigente' ||
        d.status === 'aprobado' ||
        d.status === 'sin_reportes' ||
        documentHasFiles(d))
  ).length

  const pendingFines = dossier.fines.filter((f) => f.status === 'pendiente')
  const pendingFinesTotal = pendingFines.reduce((s, f) => s + Number(f.amount || 0), 0)

  const matricula = dossier.documents.find((d) => d.doc_type === 'matricula')
  let matriculaDaysUntilExpiry: number | null = null
  if (matricula?.expires_at) {
    const exp = new Date(matricula.expires_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    matriculaDaysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const criticalMissing = ['poder_contrato', 'matricula'].filter(
    (t) => {
      if (t === 'poder_contrato') {
        const row =
          dossier.documents.find((d) => d.doc_type === 'poder_contrato') ??
          dossier.documents.find((d) => (d.doc_type as string) === 'contrato_compra_venta') ??
          dossier.documents.find((d) => (d.doc_type as string) === 'poder')
        return !row || row.status === 'falta' || (!documentHasFiles(row) && row.status !== 'pendiente')
      }
      const row = dossier.documents.find((d) => d.doc_type === t)
      return !row || row.status === 'falta' || (!documentHasFiles(row) && row.status !== 'pendiente')
    }
  )

  let legalStatusLabel = 'Listo'
  let legalStatusTone: VehicleLegalSummary['legalStatusTone'] = 'ok'
  if (criticalMissing.length > 0 || pendingFines.length > 0) {
    legalStatusLabel = 'Revisar'
    legalStatusTone = pendingFines.length > 0 ? 'danger' : 'warn'
  } else if (matriculaDaysUntilExpiry != null && matriculaDaysUntilExpiry <= 30) {
    legalStatusLabel = 'Matrícula por vencer'
    legalStatusTone = 'warn'
  }

  return {
    docsComplete,
    docsTotal,
    pendingFinesTotal,
    pendingFinesCount: pendingFines.length,
    matriculaDaysUntilExpiry,
    legalStatusLabel,
    legalStatusTone,
  }
}

const PODER_CONTRATO_ALIASES = ['poder_contrato', 'contrato_compra_venta', 'poder'] as const

async function findVehicleDocumentRow(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  docType: VehicleDocType
) {
  const types =
    docType === 'poder_contrato' ? PODER_CONTRATO_ALIASES : ([docType] as readonly string[])
  for (const t of types) {
    const { data, error } = await supabase
      .from('inventory_vehicle_documents')
      .select('*')
      .eq('inventoryoracle_id', inventoryoracleId)
      .eq('doc_type', t)
      .maybeSingle()
    if (error) throw error
    if (data) return data as VehicleDocumentRow
  }
  return null
}

type ActivityLogInput = {
  document_id: string
  inventoryoracle_id: string
  doc_type: string
  action: VehicleDocumentActivityAction
  actor_id?: string | null
  actor_name?: string | null
  file_name?: string | null
  detail?: string | null
}

async function logDocumentActivity(supabase: SupabaseClient, input: ActivityLogInput) {
  try {
    const { error } = await supabase.from('inventory_vehicle_document_activity').insert({
      document_id: input.document_id,
      inventoryoracle_id: input.inventoryoracle_id,
      doc_type: input.doc_type,
      action: input.action,
      actor_id: input.actor_id ?? null,
      actor_name: input.actor_name?.trim() || null,
      file_name: input.file_name ?? null,
      detail: input.detail ?? null,
    })
    if (error) console.warn('[document-activity]', error.message)
  } catch (err) {
    console.warn('[document-activity]', err)
  }
}

const ACTION_LABELS: Record<VehicleDocumentActivityAction, string> = {
  upload: 'Subió archivo',
  delete_file: 'Eliminó archivo',
  update_meta: 'Actualizó detalle',
  update_status: 'Cambió estado',
}

export function documentActivityActionLabel(action: VehicleDocumentActivityAction): string {
  return ACTION_LABELS[action]
}

export async function fetchDocumentActivityLog(
  supabase: SupabaseClient,
  documentId: string
): Promise<DocumentActivityEntry[]> {
  const entries: DocumentActivityEntry[] = []

  const { data: activities, error: actErr } = await supabase
    .from('inventory_vehicle_document_activity')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (!actErr && activities?.length) {
    for (const a of activities) {
      entries.push({
        id: a.id,
        at: a.created_at,
        action: a.action as VehicleDocumentActivityAction,
        actorName: a.actor_name ?? 'Usuario desconocido',
        fileName: a.file_name,
        detail: a.detail,
      })
    }
  }

  const loggedFileNames = new Set(
    entries.filter((e) => e.action === 'upload' && e.fileName).map((e) => e.fileName!)
  )

  const { data: files } = await supabase
    .from('inventory_vehicle_document_files')
    .select('id, file_name, created_at, uploaded_by, uploader:profiles!uploaded_by(full_name)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  for (const f of files ?? []) {
    if (loggedFileNames.has(f.file_name)) continue
    const uploader = f.uploader as { full_name?: string | null } | null
    entries.push({
      id: `file-${f.id}`,
      at: f.created_at,
      action: 'upload',
      actorName: uploader?.full_name?.trim() || 'Usuario desconocido',
      fileName: f.file_name,
    })
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export async function uploadVehicleDocument(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  docType: VehicleDocType,
  file: File,
  profileId: string | null,
  meta?: {
    detail_text?: string
    expires_at?: string | null
    status?: VehicleDocStatus
    actor_name?: string | null
  }
): Promise<VehicleDocumentRow> {
  const docRow = await findVehicleDocumentRow(supabase, inventoryoracleId, docType)
  if (!docRow) throw new Error('Documento no encontrado')

  const storageType = docType === 'poder_contrato' ? 'poder_contrato' : docType
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`
  const filePath = `${inventoryoracleId}/${storageType}/${safeName}`

  const { error: upErr } = await supabase.storage
    .from(INVENTORY_VEHICLE_DOCS_BUCKET)
    .upload(filePath, file, { contentType: file.type || undefined })

  if (upErr) throw upErr

  const { data: urlData } = supabase.storage.from(INVENTORY_VEHICLE_DOCS_BUCKET).getPublicUrl(filePath)

  const { error: fileErr } = await supabase.from('inventory_vehicle_document_files').insert({
    document_id: docRow.id,
    file_path: filePath,
    file_url: urlData.publicUrl,
    file_name: file.name,
    mime_type: file.type || null,
    uploaded_by: profileId,
  })
  if (fileErr) throw fileErr

  const { data, error } = await supabase
    .from('inventory_vehicle_documents')
    .update({
      status: meta?.status ?? 'cargado',
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_name: file.name,
      mime_type: file.type || null,
      detail_text: meta?.detail_text ?? docRow.detail_text,
      expires_at: meta?.expires_at ?? docRow.expires_at,
      uploaded_by: profileId,
    })
    .eq('id', docRow.id)
    .select('*')
    .single()

  if (error) throw error
  const [withFiles] = await attachDocumentFiles(supabase, [data as VehicleDocumentRow])
  await logDocumentActivity(supabase, {
    document_id: docRow.id,
    inventoryoracle_id: inventoryoracleId,
    doc_type: docRow.doc_type,
    action: 'upload',
    actor_id: profileId,
    actor_name: meta?.actor_name,
    file_name: file.name,
  })
  return withFiles
}

export async function deleteVehicleDocumentFile(
  supabase: SupabaseClient,
  fileId: string,
  audit?: { actor_id?: string | null; actor_name?: string | null }
): Promise<void> {
  const { data: fileRow, error: readErr } = await supabase
    .from('inventory_vehicle_document_files')
    .select('*')
    .eq('id', fileId)
    .maybeSingle()
  if (readErr) throw readErr

  if (fileRow) {
    const { data: docMeta } = await supabase
      .from('inventory_vehicle_documents')
      .select('inventoryoracle_id, doc_type, detail_text')
      .eq('id', fileRow.document_id)
      .maybeSingle()

    await supabase.storage.from(INVENTORY_VEHICLE_DOCS_BUCKET).remove([fileRow.file_path])
    const { error: delErr } = await supabase
      .from('inventory_vehicle_document_files')
      .delete()
      .eq('id', fileId)
    if (delErr) throw delErr

    const { data: remaining, error: remErr } = await supabase
      .from('inventory_vehicle_document_files')
      .select('*')
      .eq('document_id', fileRow.document_id)
      .order('created_at', { ascending: false })
    if (remErr) throw remErr

    const latest = remaining?.[0]
    const catalog = VEHICLE_DOCUMENT_CATALOG.find((item) => item.docType === docMeta?.doc_type)
    const statusWithoutFiles: VehicleDocStatus = catalog?.requiresFile
      ? 'falta'
      : docMeta?.detail_text?.trim()
        ? 'completo'
        : catalog?.defaultStatus ?? 'pendiente'
    const { error: updErr } = await supabase
      .from('inventory_vehicle_documents')
      .update(
        latest
          ? {
              status: 'cargado',
              file_path: latest.file_path,
              file_url: latest.file_url,
              file_name: latest.file_name,
              mime_type: latest.mime_type,
            }
          : {
              status: statusWithoutFiles,
              file_path: null,
              file_url: null,
              file_name: null,
              mime_type: null,
            }
      )
      .eq('id', fileRow.document_id)
    if (updErr) throw updErr

    if (docMeta) {
      await logDocumentActivity(supabase, {
        document_id: fileRow.document_id,
        inventoryoracle_id: docMeta.inventoryoracle_id,
        doc_type: docMeta.doc_type,
        action: 'delete_file',
        actor_id: audit?.actor_id,
        actor_name: audit?.actor_name,
        file_name: fileRow.file_name,
      })
    }
    return
  }

  throw new Error('Archivo no encontrado')
}

export async function updateVehicleDocumentMeta(
  supabase: SupabaseClient,
  documentId: string,
  patch: Partial<{
    status: VehicleDocStatus
    detail_text: string | null
    expires_at: string | null
  }>,
  audit?: {
    actor_id?: string | null
    actor_name?: string | null
    inventoryoracle_id?: string
    doc_type?: string
    previous_status?: string
  }
) {
  const { data, error } = await supabase
    .from('inventory_vehicle_documents')
    .update(patch)
    .eq('id', documentId)
    .select('*')
    .single()
  if (error) throw error

  const row = data as VehicleDocumentRow
  const detailParts: string[] = []
  if (patch.detail_text !== undefined) detailParts.push('detalle')
  if (patch.expires_at !== undefined) detailParts.push('vencimiento')
  if (patch.status !== undefined && patch.status !== audit?.previous_status) {
    await logDocumentActivity(supabase, {
      document_id: documentId,
      inventoryoracle_id: audit?.inventoryoracle_id ?? row.inventoryoracle_id,
      doc_type: audit?.doc_type ?? row.doc_type,
      action: 'update_status',
      actor_id: audit?.actor_id,
      actor_name: audit?.actor_name,
      detail: `Estado: ${patch.status}`,
    })
  }
  if (detailParts.length > 0) {
    await logDocumentActivity(supabase, {
      document_id: documentId,
      inventoryoracle_id: audit?.inventoryoracle_id ?? row.inventoryoracle_id,
      doc_type: audit?.doc_type ?? row.doc_type,
      action: 'update_meta',
      actor_id: audit?.actor_id,
      actor_name: audit?.actor_name,
      detail: detailParts.join(', '),
    })
  }

  return row
}

export async function addVehicleFine(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  input: {
    title: string
    amount: number
    fine_date?: string | null
    location?: string | null
    payer_notes?: string | null
  },
  profileId: string | null
) {
  const { data, error } = await supabase
    .from('inventory_vehicle_fines')
    .insert({
      inventoryoracle_id: inventoryoracleId,
      title: input.title,
      amount: input.amount,
      fine_date: input.fine_date ?? null,
      location: input.location ?? null,
      payer_notes: input.payer_notes ?? null,
      created_by: profileId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as VehicleFineRow
}

export async function updateVehicleFine(
  supabase: SupabaseClient,
  fineId: string,
  patch: Partial<{ status: string; payer_notes: string | null }>
) {
  const { data, error } = await supabase.from('inventory_vehicle_fines').update(patch).eq('id', fineId).select('*').single()
  if (error) throw error
  return data as VehicleFineRow
}

export async function deleteVehicleFine(supabase: SupabaseClient, fineId: string) {
  const { error } = await supabase.from('inventory_vehicle_fines').delete().eq('id', fineId)
  if (error) throw error
}

export async function updateVehicleDebt(
  supabase: SupabaseClient,
  debtId: string,
  patch: Partial<{
    status: string
    amount: number | null
    institution: string | null
    detail_text: string | null
  }>
) {
  const { data, error } = await supabase.from('inventory_vehicle_debts').update(patch).eq('id', debtId).select('*').single()
  if (error) throw error
  return data as VehicleDebtRow
}

export async function addVehicleOwner(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  input: {
    owner_name: string
    id_number?: string | null
    from_date?: string | null
    to_date?: string | null
    is_current?: boolean
    notes?: string | null
  }
) {
  if (input.is_current) {
    await supabase
      .from('inventory_vehicle_owners')
      .update({ is_current: false })
      .eq('inventoryoracle_id', inventoryoracleId)
  }
  const { data, error } = await supabase
    .from('inventory_vehicle_owners')
    .insert({
      inventoryoracle_id: inventoryoracleId,
      owner_name: input.owner_name,
      id_number: input.id_number ?? null,
      from_date: input.from_date ?? null,
      to_date: input.to_date ?? null,
      is_current: input.is_current ?? false,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as VehicleOwnerRow
}

export async function addVehicleEvent(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  input: {
    title: string
    description?: string | null
    event_date?: string
    event_type?: string
    status?: string
  },
  profileId: string | null
) {
  const { data, error } = await supabase
    .from('inventory_vehicle_events')
    .insert({
      inventoryoracle_id: inventoryoracleId,
      title: input.title,
      description: input.description ?? null,
      event_date: input.event_date ?? new Date().toISOString().slice(0, 10),
      event_type: input.event_type ?? 'otro',
      status: input.status ?? 'activo',
      created_by: profileId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as VehicleEventRow
}

export async function addInternalNote(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  authorName: string,
  noteText: string,
  profileId: string | null
) {
  const { data, error } = await supabase
    .from('inventory_vehicle_internal_notes')
    .insert({
      inventoryoracle_id: inventoryoracleId,
      author_name: authorName,
      note_text: noteText,
      created_by: profileId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as VehicleInternalNoteRow
}
