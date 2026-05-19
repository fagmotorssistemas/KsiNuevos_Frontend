/**
 * Rutas principales del usuario con `profiles.role === 'admin'`.
 * No dependen de `role_permissions`: el acceso es fijo en código + middleware.
 */
export const ADMIN_PRIMARY_NAV: { href: string; label: string }[] = [
  { href: '/leads', label: 'Ventas' },
  { href: '/wallet', label: 'Contabilidad' },
  { href: '/legal/cases', label: 'Gestión Legal' },
  { href: '/taller/dashboard', label: 'Taller' },
  { href: '/marketing', label: 'Marketing' },
  { href: '/rastreadores', label: 'Rastreadores' },
  { href: '/seguros', label: 'Seguros' },
  { href: '/scraper', label: 'Scraper' },
  { href: '/report', label: 'Monitoreo' },
  { href: '/admin/permisos', label: 'Permisos' },
]

/** Texto para el panel de permisos (rol admin = no editable). */
export const ADMIN_FIXED_ACCESS_LINES = [
  'Ventas (leads, agenda, inventario vendedor, etc.)',
  'Contabilidad y cartera',
  'Legal / casos',
  'Taller',
  'Marketing, vídeos y métricas',
  'Rastreadores / GPS',
  'Seguros (pólizas y catálogos)',
  'Scraper y monitoreo',
  'Este panel de permisos y configuración admin',
] as const
