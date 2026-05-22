import type {
  MarketingDevRequestPriority,
  MarketingDevRequestStatus,
  MarketingDevRequestType,
  MarketingDevTargetModule,
} from '@/types/marketing-dev-requests'

export const BUCKET = 'marketing-dev-request-attachments'
export const MAX_FILE_BYTES = 26_214_400
export const MAX_FILES = 8

export const TARGET_MODULE_OPTIONS: { value: MarketingDevTargetModule; label: string }[] = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'ventas', label: 'Ventas / Showroom / Leads' },
  { value: 'contabilidad', label: 'Contabilidad / Cartera' },
  { value: 'taller', label: 'Taller' },
  { value: 'legal', label: 'Legal' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'rastreadores', label: 'GPS / Rastreadores' },
  { value: 'admin', label: 'Administración' },
  { value: 'home', label: 'Sitio público / Home' },
  { value: 'auth', label: 'Login / Cuenta' },
  { value: 'general', label: 'General (varios módulos)' },
  { value: 'other', label: 'Otro' },
]

export const REQUEST_TYPE_OPTIONS: { value: MarketingDevRequestType; label: string; hint: string }[] = [
  { value: 'bug', label: 'Error / falla', hint: 'Algo no funciona como debería' },
  { value: 'feature', label: 'Nueva función', hint: 'Funcionalidad que aún no existe' },
  { value: 'improvement', label: 'Mejora', hint: 'Optimizar algo que ya existe' },
  { value: 'support', label: 'Ayuda / duda', hint: 'No sé cómo usar algo' },
  { value: 'other', label: 'Otro', hint: 'Cualquier otro tipo de solicitud' },
]

export const PRIORITY_OPTIONS: { value: MarketingDevRequestPriority; label: string }[] = [
  { value: 'low', label: 'Baja — puede esperar' },
  { value: 'medium', label: 'Media — normal' },
  { value: 'high', label: 'Alta — afecta mi trabajo' },
  { value: 'urgent', label: 'Urgente — bloquea operación' },
]

export const STATUS_LABELS: Record<MarketingDevRequestStatus, string> = {
  new: 'Nuevo',
  in_review: 'En revisión',
  in_progress: 'En desarrollo',
  blocked: 'Bloqueado',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

export const STATUS_STYLES: Record<MarketingDevRequestStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  in_review: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-violet-100 text-violet-800',
  blocked: 'bg-rose-100 text-rose-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const TYPE_LABELS: Record<MarketingDevRequestType, string> = {
  bug: 'Error',
  feature: 'Nueva función',
  improvement: 'Mejora',
  support: 'Soporte',
  other: 'Otro',
}

export const MODULE_LABELS: Record<MarketingDevTargetModule, string> = {
  home: 'Home',
  ventas: 'Ventas',
  contabilidad: 'Contabilidad',
  taller: 'Taller',
  legal: 'Legal',
  marketing: 'Marketing',
  seguros: 'Seguros',
  rastreadores: 'Rastreadores',
  admin: 'Admin',
  auth: 'Cuenta',
  general: 'General',
  other: 'Otro',
}

export const ADMIN_STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as MarketingDevRequestStatus,
  label,
}))
