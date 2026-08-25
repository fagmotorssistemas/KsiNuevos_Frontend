'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getSidebarShell, type SidebarShell } from '@/lib/sidebar-shell'
import { AccountingSidebar } from '@/components/layout/accounting-sidebar'
import { SellerSidebar } from '@/components/layout/seller-sidebar'
import { MarketingSidebar } from '@/components/layout/marketing-sidebar'
import { ScraperSidebar } from '@/components/layout/scraper-sidebar'
import { TallerSidebar } from '@/components/features/taller/TallerSidebar'
import { SegurosSidebar } from '@/components/layout/seguros-sidebar'

/**
 * Muestra el sidebar del último módulo visitado (persistido en localStorage).
 * No monta ningún sidebar hasta leer el valor guardado, para que rutas
 * compartidas como /finance no pisen Ventas con Contabilidad.
 */
export function DynamicStaffSidebar() {
  const pathname = usePathname()
  const [shell, setShell] = useState<SidebarShell | null>(() =>
    typeof window === "undefined" ? null : getSidebarShell()
  )

  useEffect(() => {
    setShell(getSidebarShell())
  }, [pathname])

  if (!shell) return null

  switch (shell) {
    case 'seller':
      return <SellerSidebar />
    case 'marketing':
      return <MarketingSidebar />
    case 'scraper':
      return <ScraperSidebar />
    case 'taller':
      return <TallerSidebar />
    case 'seguros':
      return <SegurosSidebar />
    case 'rastreadores':
      return <AccountingSidebar />
    case 'accounting':
    default:
      return <AccountingSidebar />
  }
}
