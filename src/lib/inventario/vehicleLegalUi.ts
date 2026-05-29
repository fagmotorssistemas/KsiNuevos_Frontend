import type { DocCatalogEntry } from '@/lib/inventario/vehicleDocumentCatalog'
import type { VehicleDocStatus, VehicleDebtStatus, VehicleDocumentRow, VehicleDebtRow } from '@/types/vehicleLegal.types'

export type ChecklistCellStatus = 'ok' | 'warn' | 'missing' | 'na'

const DOC_OK: VehicleDocStatus[] = ['cargado', 'vigente', 'aprobado', 'sin_reportes', 'completo']

export function documentHasFiles(doc: VehicleDocumentRow | undefined): boolean {
  if (!doc) return false
  if (doc.files && doc.files.length > 0) return true
  return Boolean(doc.file_url)
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
