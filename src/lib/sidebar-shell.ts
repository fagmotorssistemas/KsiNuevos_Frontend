export const SIDEBAR_SHELL_KEY = 'ksi-sidebar-shell'

export type SidebarShell =
  | 'seller'
  | 'accounting'
  | 'marketing'
  | 'scraper'
  | 'taller'
  | 'seguros'
  | 'rastreadores'

export function setSidebarShell(shell: SidebarShell) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_SHELL_KEY, shell)
}

export function getSidebarShell(): SidebarShell {
  if (typeof window === 'undefined') return 'accounting'
  const stored = window.localStorage.getItem(SIDEBAR_SHELL_KEY)
  if (
    stored === 'seller' ||
    stored === 'accounting' ||
    stored === 'marketing' ||
    stored === 'scraper' ||
    stored === 'taller' ||
    stored === 'seguros' ||
    stored === 'rastreadores'
  ) {
    return stored
  }
  return 'accounting'
}

/** Módulo del nav principal asociado al sidebar persistido (rutas compartidas como /finance). */
export function primaryModuleFromShell(
  shell: SidebarShell | null
): 'ventas' | 'finanzas' | 'marketing' | 'taller' | 'seguros' | null {
  if (shell === 'seller') return 'ventas'
  if (shell === 'accounting' || shell === 'rastreadores') return 'finanzas'
  if (shell === 'marketing' || shell === 'scraper') return 'marketing'
  if (shell === 'taller') return 'taller'
  if (shell === 'seguros') return 'seguros'
  return null
}

/** Ruta global de solicitudes a desarrollo (visible para todo el personal). */
export const SOLICITUDES_DESARROLLO_HREF = '/solicitudes-desarrollo'
