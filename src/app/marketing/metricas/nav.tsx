'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Bell, ClipboardList, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { fetchMetaAdAlertsBadgeCount } from '@/app/marketing/metricas/lib/meta-ad-alerts-db'
import { useAuth } from '@/hooks/useAuth'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

/** Definido aquí para no pasar componentes desde Server Components (Next.js). */
const NAV_ITEMS: NavItem[] = [
  { href: '/marketing/metricas', label: 'Resumen', icon: BarChart3 },
  { href: '/marketing/metricas/reporte', label: 'Reporte diario', icon: ClipboardList },
  { href: '/marketing/metricas/inventario', label: 'Inventario', icon: Package },
  { href: '/marketing/metricas/alertas', label: 'Alertas', icon: Bell },
]

export function MetricasNav() {
  const pathname = usePathname()
  const { supabase } = useAuth()
  const [badgeCount, setBadgeCount] = useState<number>(0)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function loadBadge() {
      try {
        const total = await fetchMetaAdAlertsBadgeCount(supabase)
        if (!cancelled) setBadgeCount(total)
      } catch {
        if (!cancelled) setBadgeCount(0)
      }
    }

    void loadBadge()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const alertHref = useMemo(() => '/marketing/metricas/alertas', [])

  return (
    <nav className="rounded-2xl border border-gray-200 bg-white shadow-sm p-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {NAV_ITEMS.map((it) => {
          const active =
            it.href === '/marketing/metricas'
              ? pathname === '/marketing/metricas'
              : pathname === it.href || pathname.startsWith(`${it.href}/`)
          const Icon = it.icon
          const showBadge = it.href === alertHref && badgeCount > 0
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                'relative flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold transition',
                active ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{it.label}</span>
              {showBadge && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-[10px] font-extrabold text-white flex items-center justify-center">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

