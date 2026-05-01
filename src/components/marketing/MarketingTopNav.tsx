'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/marketing', label: 'Marketing' },
  { href: '/marketing/guiones', label: 'Guiones' },
  { href: '/marketing/publicaciones', label: 'Publicaciones' },
  { href: '/marketing/metricas', label: 'Métricas' },
  { href: '/marketing/planificador', label: 'Planificador' },
]

export function MarketingTopNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/marketing') return pathname === '/marketing'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="hidden md:block">
            <nav className="flex items-center space-x-1">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    'px-4 py-2 text-sm font-medium rounded-full transition-colors',
                    isActive(l.href)
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="md:hidden">
          <Link
            href="/marketing"
            className="px-4 py-2 text-sm font-medium rounded-full transition-colors bg-slate-900 text-white shadow-sm"
          >
            Marketing
          </Link>
        </div>
      </div>
    </header>
  )
}

