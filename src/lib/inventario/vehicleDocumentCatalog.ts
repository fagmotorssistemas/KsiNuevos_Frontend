import type { VehicleDocType } from '@/types/vehicleLegal.types'

export const INVENTORY_VEHICLE_DOCS_BUCKET = 'inventory-vehicle-documents'

export type DocCatalogEntry = {
  docType: VehicleDocType
  label: string
  category: 'legal' | 'physical'
  requiresFile: boolean
  defaultStatus: 'falta' | 'pendiente'
}

export const VEHICLE_DOCUMENT_CATALOG: DocCatalogEntry[] = [
  { docType: 'titulo_propiedad', label: 'Título de propiedad', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'matricula', label: 'Matrícula vigente', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'soat', label: 'SOAT', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'revision_tecnica', label: 'Revisión técnica vehicular', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'factura_compra', label: 'Factura original de compra', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'levantamiento_prendas', label: 'Levantamiento de prendas', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'liberacion_bancaria', label: 'Liberación bancaria', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'informe_ant_siat', label: 'Informe ANT / SIAT', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'contrato_compra_venta', label: 'Contrato de compra-venta', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'historial_mantenimiento', label: 'Historial de mantenimiento', category: 'physical', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'informe_peritaje', label: 'Informe de peritaje', category: 'physical', requiresFile: false, defaultStatus: 'pendiente' },
  { docType: 'accesorios_llaves', label: 'Accesorios / llaves', category: 'physical', requiresFile: false, defaultStatus: 'pendiente' },
]

export const VEHICLE_DEBT_CATALOG: { debtType: 'impuesto_predial' | 'banco_financiera' | 'dinardap'; label: string }[] = [
  { debtType: 'impuesto_predial', label: 'Impuesto predial AME' },
  { debtType: 'banco_financiera', label: 'Deuda con banco / financiera' },
  { debtType: 'dinardap', label: 'Reportes DINARDAP' },
]

export function docCatalogByType(docType: VehicleDocType) {
  return VEHICLE_DOCUMENT_CATALOG.find((d) => d.docType === docType)
}
