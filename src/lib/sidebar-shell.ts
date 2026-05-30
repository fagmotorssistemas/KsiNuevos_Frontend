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

/** Ruta global de solicitudes a desarrollo (visible para todo el personal). */
export const SOLICITUDES_DESARROLLO_HREF = '/solicitudes-desarrollo'
