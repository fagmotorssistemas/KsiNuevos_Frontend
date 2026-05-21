import type { SupabaseClient } from '@supabase/supabase-js'
import {
  INVENTORY_VEHICLE_DOCS_BUCKET,
  VEHICLE_DEBT_CATALOG,
  VEHICLE_DOCUMENT_CATALOG,
} from '@/lib/inventario/vehicleDocumentCatalog'
import type {
  VehicleDebtRow,
  VehicleDocumentRow,
  VehicleEventRow,
  VehicleFineRow,
  VehicleInternalNoteRow,
  VehicleLegalDossier,
  VehicleLegalSummary,
  VehicleOwnerRow,
  VehicleDocStatus,
  VehicleDocType,
} from '@/types/vehicleLegal.types'

const ACCEPT_UPLOAD = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

export { ACCEPT_UPLOAD }

import { normalizePlate } from '@/lib/inventario/normalizePlate'

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
    return {
      inventoryoracleId,
      documents: (retryDocs ?? []) as VehicleDocumentRow[],
      fines: (finesRes.data ?? []) as VehicleFineRow[],
      debts: (debtsRes.data ?? []) as VehicleDebtRow[],
      owners: (ownersRes.data ?? []) as VehicleOwnerRow[],
      events: (eventsRes.data ?? []) as VehicleEventRow[],
      notes: (notesRes.data ?? []) as VehicleInternalNoteRow[],
    }
  }

  return {
    inventoryoracleId,
    documents,
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
      (d.status === 'cargado' || d.status === 'vigente' || d.status === 'aprobado' || d.status === 'sin_reportes' || d.file_url)
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

  const criticalMissing = ['levantamiento_prendas', 'liberacion_bancaria', 'contrato_compra_venta'].filter(
    (t) => {
      const row = dossier.documents.find((d) => d.doc_type === t)
      return !row || row.status === 'falta' || (!row.file_url && row.status !== 'pendiente')
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

export async function uploadVehicleDocument(
  supabase: SupabaseClient,
  inventoryoracleId: string,
  docType: VehicleDocType,
  file: File,
  profileId: string | null,
  meta?: { detail_text?: string; expires_at?: string | null; status?: VehicleDocStatus }
): Promise<VehicleDocumentRow> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`
  const filePath = `${inventoryoracleId}/${docType}/${safeName}`

  const { error: upErr } = await supabase.storage
    .from(INVENTORY_VEHICLE_DOCS_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type || undefined })

  if (upErr) throw upErr

  const { data: urlData } = supabase.storage.from(INVENTORY_VEHICLE_DOCS_BUCKET).getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('inventory_vehicle_documents')
    .update({
      status: meta?.status ?? 'cargado',
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_name: file.name,
      mime_type: file.type || null,
      detail_text: meta?.detail_text ?? null,
      expires_at: meta?.expires_at ?? null,
      uploaded_by: profileId,
    })
    .eq('inventoryoracle_id', inventoryoracleId)
    .eq('doc_type', docType)
    .select('*')
    .single()

  if (error) throw error
  return data as VehicleDocumentRow
}

export async function updateVehicleDocumentMeta(
  supabase: SupabaseClient,
  documentId: string,
  patch: Partial<{
    status: VehicleDocStatus
    detail_text: string | null
    expires_at: string | null
  }>
) {
  const { data, error } = await supabase
    .from('inventory_vehicle_documents')
    .update(patch)
    .eq('id', documentId)
    .select('*')
    .single()
  if (error) throw error
  return data as VehicleDocumentRow
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
