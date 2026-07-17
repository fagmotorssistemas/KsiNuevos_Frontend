import type { VehicleDocType } from '@/types/vehicleLegal.types'

export const INVENTORY_VEHICLE_DOCS_BUCKET = 'inventory-vehicle-documents'

export type DocCatalogEntry = {
  docType: VehicleDocType
  label: string
  category: 'legal' | 'physical'
  requiresFile: boolean
  allowsFile?: boolean
  defaultStatus: 'falta' | 'pendiente'
}

export const VEHICLE_DOCUMENT_CATALOG: DocCatalogEntry[] = [
  { docType: 'poder_contrato', label: 'Poder / Contrato', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'matricula', label: 'Matrícula vigente', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'revision_tecnica', label: 'Revisión técnica vehicular', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'contrato_interno', label: 'Contrato interno', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'prenda_industrial', label: 'Prenda industrial', category: 'legal', requiresFile: false, allowsFile: true, defaultStatus: 'pendiente' },
  { docType: 'levantamiento_prendas', label: 'Levantamiento de prenda', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'informe_ant_siat', label: 'Informe ANT', category: 'legal', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'historial_mantenimiento', label: 'Historial de mantenimiento', category: 'physical', requiresFile: true, defaultStatus: 'falta' },
  { docType: 'accesorios_llaves', label: 'Accesorios / llaves', category: 'physical', requiresFile: false, allowsFile: true, defaultStatus: 'pendiente' },
  { docType: 'documentos_pendientes', label: 'Documentos pendientes', category: 'legal', requiresFile: false, defaultStatus: 'pendiente' },
  { docType: 'procesos_legales', label: 'Procesos legales', category: 'legal', requiresFile: false, allowsFile: true, defaultStatus: 'pendiente' },
]

export const VEHICLE_DEBT_CATALOG: { debtType: 'impuesto_predial' | 'banco_financiera' | 'dinardap'; label: string }[] = [
  { debtType: 'impuesto_predial', label: 'Impuesto predial AME' },
  { debtType: 'banco_financiera', label: 'Deuda con banco / financiera' },
  { debtType: 'dinardap', label: 'Reportes DINARDAP' },
]

export function docCatalogByType(docType: VehicleDocType) {
  return VEHICLE_DOCUMENT_CATALOG.find((d) => d.docType === docType)
}

/** Abreviaturas para columnas del reporte de documentación */
export const DOCUMENT_SHORT: Record<VehicleDocType, string> = {
  poder_contrato: 'P/C',
  matricula: 'MAT',
  revision_tecnica: 'RTV',
  contrato_interno: 'CIN',
  prenda_industrial: 'PRE',
  levantamiento_prendas: 'LEV',
  informe_ant_siat: 'ANT',
  historial_mantenimiento: 'MAN',
  accesorios_llaves: 'LLV',
  documentos_pendientes: 'PEN',
  procesos_legales: 'LEG',
}

export const DEBT_SHORT: Record<(typeof VEHICLE_DEBT_CATALOG)[number]['debtType'], string> = {
  impuesto_predial: 'AME',
  banco_financiera: 'FIN',
  dinardap: 'DIN',
}
