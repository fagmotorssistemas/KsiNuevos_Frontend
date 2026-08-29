import { PUBLIC_PATHS } from './publicPaths'

export function isPublicNavLinkActive(href: string, pathname: string): boolean {
  if (href === PUBLIC_PATHS.comprar) {
    return (
      pathname === '/usados' ||
      pathname.startsWith('/usados/') ||
      pathname.startsWith('/vehiculos') ||
      pathname.startsWith('/buyCar')
    )
  }

  if (href === PUBLIC_PATHS.vender) {
    return (
      pathname === '/vender' ||
      pathname.startsWith('/vender/') ||
      pathname.startsWith('/sellCar')
    )
  }

  if (href === PUBLIC_PATHS.creditos) {
    return (
      pathname === '/creditos' ||
      pathname.startsWith('/creditos/') ||
      pathname.startsWith('/creditCar') ||
      pathname.startsWith('/simulador')
    )
  }

  if (href === PUBLIC_PATHS.nosotros) {
    return (
      pathname === '/nosotros' ||
      pathname.startsWith('/nosotros/') ||
      pathname.startsWith('/aboutUs')
    )
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
