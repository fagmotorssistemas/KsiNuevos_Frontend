'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  acquireStaffNavHide,
  getSidebarShell,
  primaryModuleFromShell,
  subscribeStaffNavHidden,
  type SidebarShell,
} from '@/lib/sidebar-shell'

export function useSidebarShell(): SidebarShell | null {
  const pathname = usePathname()
  const [shell, setShell] = useState<SidebarShell | null>(() =>
    typeof window === "undefined" ? null : getSidebarShell()
  )

  useEffect(() => {
    setShell(getSidebarShell())
  }, [pathname])

  return shell
}

export function usePreferredPrimaryModule() {
  return primaryModuleFromShell(useSidebarShell())
}

/** Oculta el menú lateral mientras el componente esté montado (p. ej. modal de gestionar). */
export function useHideStaffNav() {
  useEffect(() => acquireStaffNavHide(), [])
}

export function useStaffNavHidden() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => subscribeStaffNavHidden(setHidden), [])
  return hidden
}
