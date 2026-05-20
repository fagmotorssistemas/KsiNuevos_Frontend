import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import {
  rowsToPermissionMap,
  type PermissionContext,
  type EffectivePermissionRow,
  isRouteAllowed,
  isTallerOnlyAccess,
  resolveAccessDeniedRedirect,
} from '@/lib/permissions'

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

  if (pathname === '/admin/permisos' || pathname.startsWith('/admin/permisos/')) {
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return response
  }

  if (!isRouteAllowed(pathname, ctx)) {
    let target = resolveAccessDeniedRedirect(pathname, ctx)
    if (!isRouteAllowed(target, ctx)) {
      target = '/home'
    }
    if (isTallerOnlyAccess(ctx) && target === '/home') {
      target = '/taller/dashboard'
    }
    return NextResponse.redirect(new URL(target, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
