import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import {
  rowsToPermissionMap,
  type PermissionContext,
  type EffectivePermissionRow,
  isLimitedAccountingFinanceNav,
  mayAccessTallerRoutes,
  mayAccessSegurosAppRoutes,
  mayAccessMarketingRoutes,
  mayAccessLegalRoutes,
  mayAccessGpsRoutes,
  accountingRouteDenied,
  mayAccessAdminTemplates,
} from '@/lib/permissions'

/**
 * Rutas que requieren estar logueado (solo roles empresa: vendedores, admin, contabilidad, taller, etc.).
 * Las rutas de clientes son públicas: /, /home, /buyCar, /sellCar, /creditCar, /aboutUs (y similares).
 * Si el usuario no tiene sesión en una ruta protegida, se redirige a /login.
 */
const RUTAS_PROTEGIDAS_PREFIX = [
  '/perfil',
  '/leads',
  '/inventory',
  '/finance',
  '/contracts',
  '/agenda',
  '/showroom',
  '/tareas',
  '/requests',
  '/wallet',
  '/cartera-manual',
  '/inventario',
  '/dashboard',
  '/treasury',
  '/salesreport',
  '/pagos',
  '/insurance',
  '/financing',
  '/employee',
  '/cobros',
  '/billing',
  '/notasdeventas',
  '/comprobantes',
  '/taller',
  '/seguros',
  '/scraper',
  '/rastreadores',
  '/report',
  '/legal',
  '/marketing',
  '/admin',
  '/templates',
]

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS_PREFIX.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))
}

function isAccountingStaffRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toString().toLowerCase().trim()
  return r === 'contable' || r === 'finanzas' || r === 'abogado' || r === 'abogada' || r === 'admin'
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!esRutaProtegida(pathname)) {
    return response
  }

  if (!user) {
    const urlLogin = new URL('/login', request.url)
    urlLogin.searchParams.set('redirect', pathname)
    return NextResponse.redirect(urlLogin)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'cliente') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  const { data: permRows } = await supabase.rpc('get_my_effective_permissions')
  const map = rowsToPermissionMap((permRows ?? []) as EffectivePermissionRow[])
  const ctx: PermissionContext = { baseRole: profile?.role ?? null, map }

  const isAppAdmin = profile?.role === 'admin'

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAppAdmin) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  if (pathname === '/templates' || pathname.startsWith('/templates/')) {
    if (!mayAccessAdminTemplates(ctx)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Admin: rutas fijas del menú principal (sin depender de profile_roles / RPC)
  if (isAppAdmin) {
    return response
  }

  if (pathname === '/taller' || pathname.startsWith('/taller/')) {
    if (!mayAccessTallerRoutes(ctx)) {
      return NextResponse.redirect(new URL('/wallet', request.url))
    }
  }

  if (profile?.role === 'taller') {
    const allowed = pathname === '/taller' || pathname.startsWith('/taller/')
    if (!allowed) {
      return NextResponse.redirect(new URL('/taller/dashboard', request.url))
    }
  }

  if (pathname === '/legal' || pathname.startsWith('/legal/')) {
    if (!mayAccessLegalRoutes(ctx)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  if (pathname === '/marketing' || pathname.startsWith('/marketing/')) {
    if (!mayAccessMarketingRoutes(ctx)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  if (pathname === '/scraper' || pathname.startsWith('/scraper/')) {
    if (!mayAccessMarketingRoutes(ctx)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  if (pathname === '/seguros' || pathname.startsWith('/seguros/')) {
    if (!mayAccessSegurosAppRoutes(ctx)) {
      const r = (profile?.role ?? '').toString().toLowerCase().trim()
      const fallback = r === 'contable' || r === 'finanzas' ? '/wallet' : '/leads'
      return NextResponse.redirect(new URL(fallback, request.url))
    }
  }

  if (pathname === '/rastreadores' || pathname.startsWith('/rastreadores/')) {
    if (!mayAccessGpsRoutes(ctx)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  if (isAccountingStaffRole(profile?.role)) {
    const denied = accountingRouteDenied(pathname, ctx)
    if (denied) {
      let target = '/wallet'
      if (isLimitedAccountingFinanceNav(map)) {
        target = '/notasdeventas'
      }
      if (accountingRouteDenied(target, ctx)) {
        target = '/home'
      }
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
