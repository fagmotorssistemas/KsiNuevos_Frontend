export const BASE_ROLE_LABELS: Record<string, string> = {
  admin: 'Administración',
  vendedor: 'Ventas',
  marketing: 'Marketing',
  finanzas: 'Finanzas',
  contable: 'Contabilidad',
  abogado: 'Legal',
  taller: 'Taller',
  cliente: 'Cliente',
}

export const BASE_ROLE_STYLES: Record<
  string,
  { header: string; badge: string; ring: string; dot: string }
> = {
  admin: {
    header: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-400',
    dot: 'bg-slate-500',
  },
  contable: {
    header: 'text-emerald-800',
    badge: 'bg-emerald-50 text-emerald-800',
    ring: 'ring-emerald-500',
    dot: 'bg-emerald-500',
  },
  finanzas: {
    header: 'text-sky-800',
    badge: 'bg-sky-50 text-sky-800',
    ring: 'ring-sky-500',
    dot: 'bg-sky-500',
  },
  marketing: {
    header: 'text-violet-800',
    badge: 'bg-violet-50 text-violet-800',
    ring: 'ring-violet-500',
    dot: 'bg-violet-500',
  },
  vendedor: {
    header: 'text-rose-800',
    badge: 'bg-rose-50 text-rose-800',
    ring: 'ring-rose-500',
    dot: 'bg-rose-500',
  },
  abogado: {
    header: 'text-indigo-800',
    badge: 'bg-indigo-50 text-indigo-800',
    ring: 'ring-indigo-500',
    dot: 'bg-indigo-500',
  },
  taller: {
    header: 'text-amber-800',
    badge: 'bg-amber-50 text-amber-800',
    ring: 'ring-amber-500',
    dot: 'bg-amber-500',
  },
}

export const MODULE_ICONS: Record<string, string> = {
  ventas: '🛒',
  taller: '🔧',
  finanzas: '📊',
  gps: '📡',
  legal: '⚖️',
  seguros: '🛡️',
  marketing: '📣',
  admin: '⚙️',
}
