'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code2 } from 'lucide-react'
import { SOLICITUDES_DESARROLLO_HREF } from '@/lib/sidebar-shell'
import { useDevRequestsOpenCount } from '@/hooks/marketing/useDevRequestsOpenCount'

type Props = {
  isCollapsed?: boolean
  onNavigate?: () => void
}

export function SidebarDevRequestsFooter({ isCollapsed = false, onNavigate }: Props) {
  const pathname = usePathname()
  const { count } = useDevRequestsOpenCount()
  const isActive =
    pathname === SOLICITUDES_DESARROLLO_HREF ||
    pathname.startsWith(`${SOLICITUDES_DESARROLLO_HREF}/`)

  const showCount = count > 0

  return (
    <div className={`shrink-0 border-t border-gray-200 bg-gray-50/60 ${isCollapsed ? 'p-2' : 'p-3'}`}>
      <Link
        href={SOLICITUDES_DESARROLLO_HREF}
        onClick={onNavigate}
        title={
          isCollapsed
            ? `Solicitudes desarrollo${showCount ? ` (${count})` : ''}`
            : undefined
        }
        className={`
          group relative flex w-full items-center rounded-xl transition-all duration-200
          ${isCollapsed ? 'justify-center py-2.5 px-2' : 'gap-2.5 px-3 py-2.5'}
          ${
            isActive
              ? 'bg-white text-gray-900 font-medium shadow-sm ring-1 ring-gray-200'
              : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
          }
        `}
      >
        <Code2
          size={18}
          className={`shrink-0 transition-colors ${
            isActive ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />

        {!isCollapsed && (
          <>
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-sm font-semibold leading-tight">
                Solicitudes desarrollo
              </span>
              <span className="block text-[11px] text-gray-500 leading-snug">
                Reportar fallas o pedir mejoras
              </span>
            </span>
            {showCount && (
              <span className="shrink-0 tabular-nums text-[11px] font-bold bg-gray-200/90 text-gray-700 min-w-[1.5rem] px-2 py-0.5 rounded-full">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </>
        )}

        {isCollapsed && showCount && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gray-700 px-1 text-[9px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </div>
  )
}
