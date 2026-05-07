'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Bell, ClipboardList, Film, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
  { href: '/marketing/metricas/guiones', label: 'Guiones', icon: Film },
  { href: '/marketing/metricas/alertas', label: 'Alertas', icon: Bell },
]

export function MetricasNav() {
  const pathname = usePathname()
  const { supabase } = useAuth()
  const [criticalCount, setCriticalCount] = useState<number>(0)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      try {
        const db = supabase as unknown as { from: (t: string) => any }
        const { data, error } = await db.from('metrics_alerts').select('level')
        if (error || cancelled) return
        const rows = (data ?? []) as Array<{ level?: string }>
        const n = rows.filter((r) => String(r.level ?? '').toUpperCase() === 'ROJO').length
        setCriticalCount(n)
      } catch {
        /* tabla opcional */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const alertHref = useMemo(() => '/marketing/metricas/alertas', [])

  return (
    <nav className="rounded-2xl border border-gray-200 bg-white shadow-sm p-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {NAV_ITEMS.map((it) => {
          const active =
            it.href === '/marketing/metricas'
              ? pathname === '/marketing/metricas'
              : pathname === it.href || pathname.startsWith(`${it.href}/`)
          const Icon = it.icon
          const showBadge = it.href === alertHref && criticalCount > 0
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
                  {criticalCount > 9 ? '9+' : criticalCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

