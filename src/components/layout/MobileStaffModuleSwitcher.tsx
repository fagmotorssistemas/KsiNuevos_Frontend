'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  buildPrimaryNavItems,
  getPrimaryNavLinkSizeClasses,
  pathnameBelongsToPrimaryNavItem,
  resolveActivePrimaryNavItem,
  resolvePrimaryNavItemHref,
  type PermissionContext,
} from '@/lib/permissions'

type Props = {
  icon?: ReactNode
  /** Si la ruta no coincide con ningún módulo (p. ej. solicitudes-desarrollo). */
  fallbackLabel: string
}

export function MobileStaffModuleSwitcher({ icon, fallbackLabel }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { profile, permissionMap } = useAuth()

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  )

  const navItems = useMemo(() => buildPrimaryNavItems(permCtx), [permCtx])
  const activeItem = useMemo(
    () => resolveActivePrimaryNavItem(pathname ?? '', permCtx),
    [pathname, permCtx]
  )
  const label = activeItem?.label ?? fallbackLabel
  const sizeClasses = getPrimaryNavLinkSizeClasses(navItems.length)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  if (navItems.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-bold text-gray-900">{label}</span>
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg transition-transform active:scale-95 hover:opacity-90"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Cambiar módulo (${label})`}
      >
        {icon}
      </button>
      <span className="font-bold text-gray-900">{label}</span>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[75] md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-[80] w-[min(calc(100vw-2rem),20rem)] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl max-h-[min(70dvh,24rem)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          >
            {navItems.map((item) => {
              const href = resolvePrimaryNavItemHref(item, permCtx) ?? item.href
              const isActive = pathnameBelongsToPrimaryNavItem(pathname ?? '', item)

              return (
                <Link
                  key={`${item.label}-${href}`}
                  href={href}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => setOpen(false)}
                  className={`mx-2 block rounded-full font-medium transition-colors ${sizeClasses} ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
