import type { DocCatalogEntry } from '@/lib/inventario/vehicleDocumentCatalog'
import type {
  VehicleDocStatus,
  VehicleDebtStatus,
  VehicleDocumentFileRow,
  VehicleDocumentRow,
  VehicleDebtRow,
  VehicleDocType,
} from '@/types/vehicleLegal.types'
import { LEGACY_PODER_CONTRATO_TYPES } from '@/types/vehicleLegal.types'

/** Mismos títulos que la pestaña Documentos del modal */
export const DOCUMENT_SECTION_TITLES = {
  legal: 'Documentación legal',
  physical: 'Estado del vehículo',
} as const

export type ChecklistCellStatus = 'ok' | 'warn' | 'missing' | 'na'

const DOC_OK: VehicleDocStatus[] = ['cargado', 'vigente', 'aprobado', 'sin_reportes', 'completo']

export function documentHasFiles(doc: VehicleDocumentRow | undefined): boolean {
  if (!doc) return false
  return listDocumentFiles(doc).length > 0
}

export function listDocumentFiles(row: VehicleDocumentRow): VehicleDocumentFileRow[] {
  if (row.files && row.files.length > 0) return row.files
  if (row.file_url && row.file_name) {
    return [
      {
        id: `legacy-${row.id}`,
        document_id: row.id,
        file_path: row.file_path ?? '',
        file_url: row.file_url,
        file_name: row.file_name,
        mime_type: row.mime_type,
        uploaded_by: row.uploaded_by,
        created_at: row.updated_at,
      },
    ]
  }
  return []
}

export function isDocumentImageFile(file: Pick<VehicleDocumentFileRow, 'mime_type' | 'file_name'>): boolean {
  if (file.mime_type?.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.file_name)
}

export function isDocumentPdfFile(file: Pick<VehicleDocumentFileRow, 'mime_type' | 'file_name'>): boolean {
  if (file.mime_type === 'application/pdf') return true
  return /\.pdf$/i.test(file.file_name)
}

export function getDocumentCheckStatus(
  doc: VehicleDocumentRow | undefined,
  catalog: DocCatalogEntry
): ChecklistCellStatus {
  if (!doc) return 'missing'
  if (DOC_OK.includes(doc.status)) return 'ok'
  if (catalog.requiresFile && documentHasFiles(doc)) return 'ok'
  if (!catalog.requiresFile && (doc.status === 'aprobado' || doc.status === 'completo' || doc.detail_text?.trim())) {
    return 'ok'
  }
  if (doc.status === 'vence_pronto' || doc.status === 'pendiente') return 'warn'
  return 'missing'
}

export function getDebtCheckStatus(debt: VehicleDebtRow | undefined): ChecklistCellStatus {
  if (!debt) return 'missing'
  if (debt.status === 'al_dia' || debt.status === 'sin_reportes') return 'ok'
  if (debt.status === 'en_tramite' || debt.status === 'pendiente') return 'warn'
  if (debt.status === 'con_deuda') return 'missing'
  return 'warn'
}

export function getFinesCheckStatus(pendingCount: number, totalCount = 0): ChecklistCellStatus {
  if (pendingCount > 0) return 'missing'
  if (totalCount === 0) return 'warn'
  return 'ok'
}

const STATUS_LABELS: Record<string, string> = {
  falta: 'Falta',
  pendiente: 'Pendiente',
  cargado: 'Cargado',
  vigente: 'Vigente',
  vence_pronto: 'Vence pronto',
  aprobado: 'Aprobado',
  sin_reportes: 'Sin reportes',
  completo: 'Completo',
  al_dia: 'Al día',
  en_tramite: 'En trámite',
  con_deuda: 'Con deuda',
  pagada: 'Pagada',
  descontada: 'Descontada',
  activo: 'Activo',
  completado: 'Completado',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

export function docStatusClass(status: VehicleDocStatus | string): string {
  switch (status) {
    case 'cargado':
    case 'vigente':
    case 'aprobado':
    case 'sin_reportes':
    case 'completo':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'vence_pronto':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'falta':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function debtStatusClass(status: VehicleDebtStatus | string): string {
  switch (status) {
    case 'al_dia':
    case 'sin_reportes':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'en_tramite':
    case 'pendiente':
      return 'bg-amber-50 text-amber-900 border-amber-200'
    case 'con_deuda':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Prenda industrial activa → mostrar levantamiento de prenda */
export function hasPrendaIndustrial(doc: VehicleDocumentRow | undefined): boolean {
  if (!doc) return false
  const t = (doc.detail_text ?? '').toLowerCase().trim()
  return (
    t.startsWith('sí') ||
    t.startsWith('si') ||
    t.startsWith('yes') ||
    t.includes('tiene prenda') ||
    doc.status === 'cargado' ||
    doc.status === 'completo'
  )
}

const DOC_OK_STATUSES: VehicleDocStatus[] = ['cargado', 'vigente', 'aprobado', 'sin_reportes', 'completo']

function pickBestDocStatus(rows: VehicleDocumentRow[]): VehicleDocStatus {
  for (const s of DOC_OK_STATUSES) {
    if (rows.some((r) => r.status === s)) return s
  }
  return rows[0]?.status ?? 'falta'
}

/** Fusiona filas legacy (poder + contrato) en una sola para la UI */
export function mergePoderContratoRow(
  byType: Map<string, VehicleDocumentRow>
): VehicleDocumentRow | undefined {
  const canonical = byType.get('poder_contrato')
  const legacy = LEGACY_PODER_CONTRATO_TYPES.map((t) => byType.get(t)).filter(
    (r): r is VehicleDocumentRow => Boolean(r)
  )
  const rows = [canonical, ...legacy].filter((r): r is VehicleDocumentRow => Boolean(r))
  if (rows.length === 0) return undefined

  const primary =
    canonical ??
    legacy.find((r) => (r.doc_type as string) === 'contrato_compra_venta') ??
    legacy[0]
  const files = rows.flatMap((r) => listDocumentFiles(r))

  return {
    ...primary,
    doc_type: 'poder_contrato',
    status: pickBestDocStatus(rows),
    files,
  }
}

export function getCatalogDocumentRow(
  documents: Map<string, VehicleDocumentRow>,
  docType: VehicleDocType
): VehicleDocumentRow | undefined {
  if (docType === 'poder_contrato') return mergePoderContratoRow(documents)
  return documents.get(docType)
}

export function hasPoderContratoSlot(byType: Map<string, VehicleDocumentRow>): boolean {
  return Boolean(
    byType.get('poder_contrato') ||
      LEGACY_PODER_CONTRATO_TYPES.some((t) => byType.has(t))
  )
}

/** Misma visibilidad que DocumentosTab (p. ej. levantamiento solo con prenda) */
export function isDocumentCatalogItemVisible(
  docType: VehicleDocType,
  byType: Map<string, VehicleDocumentRow>
): boolean {
  if (docType === 'levantamiento_prendas') {
    return hasPrendaIndustrial(byType.get('prenda_industrial'))
  }
  return true
}

export function filterVisibleCatalogItems(
  items: readonly DocCatalogEntry[],
  byType: Map<string, VehicleDocumentRow>
): DocCatalogEntry[] {
  return items.filter((c) => isDocumentCatalogItemVisible(c.docType, byType))
}
