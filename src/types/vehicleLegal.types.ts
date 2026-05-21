export type VehicleDocType =
  | 'titulo_propiedad'
  | 'matricula'
  | 'soat'
  | 'revision_tecnica'
  | 'factura_compra'
  | 'levantamiento_prendas'
  | 'liberacion_bancaria'
  | 'informe_ant_siat'
  | 'contrato_compra_venta'
  | 'historial_mantenimiento'
  | 'informe_peritaje'
  | 'accesorios_llaves'

export type VehicleDocStatus =
  | 'falta'
  | 'pendiente'
  | 'cargado'
  | 'vigente'
  | 'vence_pronto'
  | 'aprobado'
  | 'sin_reportes'
  | 'completo'

export type VehicleDebtType = 'impuesto_predial' | 'banco_financiera' | 'dinardap' | 'otro'

export type VehicleDebtStatus = 'al_dia' | 'pendiente' | 'en_tramite' | 'sin_reportes' | 'con_deuda'

export interface VehicleDocumentRow {
  id: string
  inventoryoracle_id: string
  doc_type: VehicleDocType
  category: 'legal' | 'physical'
  status: VehicleDocStatus
  detail_text: string | null
  expires_at: string | null
  file_path: string | null
  file_url: string | null
  file_name: string | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface VehicleFineRow {
  id: string
  inventoryoracle_id: string
  title: string
  amount: number
  fine_date: string | null
  location: string | null
  payer_notes: string | null
  status: string
  created_at: string
}

export interface VehicleDebtRow {
  id: string
  inventoryoracle_id: string
  debt_type: VehicleDebtType
  status: VehicleDebtStatus
  amount: number | null
  institution: string | null
  detail_text: string | null
}

export interface VehicleOwnerRow {
  id: string
  inventoryoracle_id: string
  owner_name: string
  id_number: string | null
  from_date: string | null
  to_date: string | null
  is_current: boolean
  notes: string | null
  sort_order: number
}

export interface VehicleEventRow {
  id: string
  inventoryoracle_id: string
  event_type: string
  title: string
  description: string | null
  event_date: string
  status: string
  created_at: string
}

export interface VehicleInternalNoteRow {
  id: string
  inventoryoracle_id: string
  author_name: string
  note_text: string
  created_at: string
}

export interface VehicleLegalDossier {
  inventoryoracleId: string | null
  documents: VehicleDocumentRow[]
  fines: VehicleFineRow[]
  debts: VehicleDebtRow[]
  owners: VehicleOwnerRow[]
  events: VehicleEventRow[]
  notes: VehicleInternalNoteRow[]
}

export interface VehicleLegalSummary {
  docsComplete: number
  docsTotal: number
  pendingFinesTotal: number
  pendingFinesCount: number
  matriculaDaysUntilExpiry: number | null
  legalStatusLabel: string
  legalStatusTone: 'ok' | 'warn' | 'danger'
}
