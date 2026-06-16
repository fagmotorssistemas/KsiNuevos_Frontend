/**
 * Catálogo de permisos y rutas.
 * Definiciones maestras en `rbacCatalog.ts` (sincronizables con Supabase).
 */

export {
  MODULE_SLUGS,
  MODULE_SUBMODULES,
  VENTAS_PATH_ACCESS,
  ACCOUNTING_PATH_ACCESS,
  MARKETING_PATH_ACCESS,
  getProtectedRoutePrefixes,
  GLOBAL_STAFF_ROUTE_PREFIXES,
  findSubmoduleByRoutePrefix,
  type ModuleSlug,
  type RbacModuleDef,
  type RbacSubmoduleDef,
  RBAC_MODULE_DEFINITIONS,
  RBAC_SUBMODULE_DEFINITIONS,
} from './rbacCatalog'

/** Entrada del nav principal: módulo completo o un submódulo concreto */
export type PrimaryNavItem = {
  href: string
  label: string
  module?: import('./rbacCatalog').ModuleSlug
  submodule?: string
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: '/leads', label: 'Ventas', module: 'ventas' },
  { href: '/wallet', label: 'Contabilidad', module: 'finanzas' },
  { href: '/legal/cases', label: 'Gestión Legal', module: 'legal' },
  { href: '/taller/dashboard', label: 'Taller', module: 'taller' },
  { href: '/marketing', label: 'Marketing', module: 'marketing' },
  { href: '/rastreadores', label: 'Rastreadores', module: 'gps' },
  { href: '/seguros', label: 'Seguros', module: 'seguros' },
  { href: '/scraper', label: 'Scraper', submodule: 'scraper-marketing' },
  { href: '/report', label: 'Monitoreo', submodule: 'monitoreo-reportes' },
  { href: '/admin/permisos', label: 'Permisos', submodule: 'permisos-roles' },
]

export const ADMIN_FIXED_ACCESS_LINES = [
  'Todos los módulos y submódulos del catálogo',
  'Ventas, contabilidad, legal, taller, marketing, GPS, seguros',
  'Scraper, monitoreo y panel de permisos',
] as const
