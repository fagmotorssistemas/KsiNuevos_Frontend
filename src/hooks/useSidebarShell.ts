'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  getSidebarShell,
  primaryModuleFromShell,
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
