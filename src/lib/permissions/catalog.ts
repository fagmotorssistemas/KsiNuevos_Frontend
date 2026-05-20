/**
 * Catálogo alineado con tablas `modules` / `submodules` en Supabase.
 * Acceso = puede entrar al submódulo (can_read); CRUD interno lo regula la app/BD.
 */

export const MODULE_SLUGS = {
  ventas: 'ventas',
  taller: 'taller',
  finanzas: 'finanzas',
  gps: 'gps',
  legal: 'legal',
  seguros: 'seguros',
  marketing: 'marketing',
  admin: 'admin',
} as const

export type ModuleSlug = (typeof MODULE_SLUGS)[keyof typeof MODULE_SLUGS]

/** Submódulos por módulo (slugs en BD) */
export const MODULE_SUBMODULES: Record<ModuleSlug, readonly string[]> = {
  ventas: [
    'leads-pipeline',
    'inventario-vehiculos',
    'proformas-credito',
    'solicitudes-web',
    'visitas-showroom',
    'tareas-ventas',
  ],
  taller: [
    'ordenes-trabajo',
    'clientes-taller',
    'inventario-taller',
    'proveedores',
    'gastos-pagos',
    'personal-taller',
  ],
  finanzas: [
    'cartera-clientes',
    'cartera-manual',
    'cuotas-pb',
    'contratos-pb',
    'asesoria-financiamiento',
    'notas-de-ventas',
    'dashboard-finanzas',
    'empleados-finanzas',
    'tesoreria',
    'reporte-ventas',
    'movimientos-financiamiento',
    'cobros',
    'pagos',
    'inventario-finanzas',
    'comprobantes',
    'billing-finanzas',
    'seguros-cartera',
  ],
  gps: ['inventario-gps', 'ventas-rastreador', 'cuotas-rastreador', 'sims'],
  legal: ['casos', 'eventos-caso', 'tareas-caso', 'etapas-proceso'],
  seguros: ['polizas', 'aseguradoras', 'brokers'],
  marketing: [
    'publicaciones-sociales',
    'video-automation',
    'blog-posts',
    'metricas-campana',
    'plan-videos',
    'scraper-marketing',
  ],
  admin: [
    'gestion-usuarios',
    'agentes-prompts-ia',
    'configuracion',
    'permisos-roles',
    'plantillas-documentos',
    'monitoreo-reportes',
    'auditoria-modulos',
    'incidentes-soporte',
    'backup-exportacion',
    'api-webhooks',
  ],
}

/** Entrada del nav principal: módulo completo o un submódulo concreto */
export type PrimaryNavItem = {
  href: string
  label: string
  module?: ModuleSlug
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

/** Rutas de ventas → submódulo mínimo */
export const VENTAS_PATH_ACCESS: { prefix: string; submodule: string }[] = [
  { prefix: '/leads', submodule: 'leads-pipeline' },
  { prefix: '/inventory', submodule: 'inventario-vehiculos' },
  { prefix: '/showroom', submodule: 'visitas-showroom' },
  { prefix: '/agenda', submodule: 'visitas-showroom' },
  { prefix: '/tareas', submodule: 'tareas-ventas' },
  { prefix: '/requests', submodule: 'solicitudes-web' },
  { prefix: '/finance', submodule: 'proformas-credito' },
  { prefix: '/contracts', submodule: 'contratos-pb' },
]

/** Rutas contabilidad → submódulo */
export const ACCOUNTING_PATH_ACCESS: { prefix: string; submodule: string }[] = [
  { prefix: '/dashboard', submodule: 'dashboard-finanzas' },
  { prefix: '/wallet', submodule: 'cartera-clientes' },
  { prefix: '/cartera-manual', submodule: 'cartera-manual' },
  { prefix: '/employee', submodule: 'empleados-finanzas' },
  { prefix: '/treasury', submodule: 'tesoreria' },
  { prefix: '/salesreport', submodule: 'reporte-ventas' },
  { prefix: '/financing', submodule: 'movimientos-financiamiento' },
  { prefix: '/cobros', submodule: 'cobros' },
  { prefix: '/pagos', submodule: 'pagos' },
  { prefix: '/notasdeventas', submodule: 'notas-de-ventas' },
  { prefix: '/inventario', submodule: 'inventario-finanzas' },
  { prefix: '/contracts', submodule: 'contratos-pb' },
  { prefix: '/comprobantes', submodule: 'comprobantes' },
  { prefix: '/insurance', submodule: 'seguros-cartera' },
  { prefix: '/billing', submodule: 'billing-finanzas' },
]

export const ADMIN_FIXED_ACCESS_LINES = [
  'Todos los módulos y submódulos del catálogo',
  'Ventas, contabilidad, legal, taller, marketing, GPS, seguros',
  'Scraper, monitoreo y panel de permisos',
] as const
