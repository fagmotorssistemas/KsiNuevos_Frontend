import type { VehicleDocStatus, VehicleDebtStatus } from '@/types/vehicleLegal.types'

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
