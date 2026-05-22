"use client";

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Menu, X } from 'lucide-react'
import { MainNav } from './MainNav'
import { UserNav } from './UserNav'
import {
  buildPrimaryNavItems,
  shouldCompactPrimaryNav,
  resolvePrimaryNavItemHref,
  type PermissionContext,
} from '@/lib/permissions'

export const Navbar = () => {
  const pathname = usePathname()
  const { user, profile, permissionMap } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  )
  const mobileNavItems = useMemo(() => buildPrimaryNavItems(permCtx), [permCtx])
  const compact = shouldCompactPrimaryNav(mobileNavItems.length)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className={`mx-auto flex w-full max-w-[100vw] items-center justify-between gap-2 h-16 ${compact ? 'px-3 md:px-5' : 'container px-4 md:px-6'}`}>

        <div className={`flex min-w-0 flex-1 items-center ${compact ? 'gap-5' : 'gap-8'}`}>
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Logo de Ksi"
              width={90}
              height={30}
              priority
              className="object-contain"
            />
          </Link>

          {user && (
            <div className="hidden min-w-0 flex-1 md:block">
              <MainNav />
            </div>
          )}
        </div>

        <div className={`flex shrink-0 items-center ${compact ? 'gap-2' : 'gap-4'}`}>
          {user ? (
            <>
              <UserNav compact={compact} />
              <button
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm" className="px-6">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg animate-in slide-in-from-top-5 duration-200">
          <div className="p-4 space-y-2">
            {mobileNavItems.map((item) => {
              const href = resolvePrimaryNavItemHref(item, permCtx) ?? item.href
              return (
              <Link
                key={`${item.label}-${href}`}
                href={href}
                className={`block rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium ${
                  compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            )})}
          </div>
        </div>
      )}
    </header>
  )
}
