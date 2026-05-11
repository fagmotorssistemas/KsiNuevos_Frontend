import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { mayAccessSegurosRoute, mayAccessTallerRoute } from '@/lib/access/contableModuleAccess'

/**
 * Rutas que requieren estar logueado (solo roles empresa: vendedores, admin, contabilidad, taller, etc.).
 * Las rutas de clientes son públicas: /, /home, /buyCar, /sellCar, /creditCar, /aboutUs (y similares).
 * Si el usuario no tiene sesión en una ruta protegida, se redirige a /login.
 */
const RUTAS_PROTEGIDAS_PREFIX = [
  '/perfil', // perfil del usuario logueado (no público)
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

  // Refrescar sesión (importante para que el token no expire sin redirigir)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!esRutaProtegida(pathname)) {
    return response
  }

  // Ruta interna de la empresa: exige estar logueado
  if (!user) {
    const urlLogin = new URL('/login', request.url)
    urlLogin.searchParams.set('redirect', pathname)
    return NextResponse.redirect(urlLogin)
  }

  // Si está logueado pero es cliente, no puede entrar a rutas de la empresa → acceso denegado
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'cliente') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Módulo taller: admin, personal de taller, o contable con permiso en perfil
  if (pathname === '/taller' || pathname.startsWith('/taller/')) {
    if (!mayAccessTallerRoute(profile)) {
      return NextResponse.redirect(new URL('/wallet', request.url))
    }
  }

  // Módulo taller: solo admin y taller
  if (profile?.role === 'taller') {
    const allowed = pathname === '/taller' || pathname.startsWith('/taller/')
    if (!allowed) {
      return NextResponse.redirect(new URL('/taller/dashboard', request.url))
    }
  }

  // Módulo legal: solo admin y abogado/abogada
  if (pathname === '/legal' || pathname.startsWith('/legal/')) {
    const role = (profile?.role || '').toLowerCase().trim()
    const allowed = role === 'admin' || role === 'abogado' || role === 'abogada' || role === 'finanzas'
    if (!allowed) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Módulo marketing: admin, marketing y contable
  if (pathname === '/marketing' || pathname.startsWith('/marketing/')) {
    const role = (profile?.role || '').toLowerCase().trim()
    const allowed = role === 'admin' || role === 'marketing' || role === 'contable'
    if (!allowed) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Módulo seguros (/seguros/*): admin o contable con permiso en perfil
  if (pathname === '/seguros' || pathname.startsWith('/seguros/')) {
    if (!mayAccessSegurosRoute(profile)) {
      const r = (profile?.role ?? '').toString().toLowerCase().trim()
      const fallback = r === 'contable' ? '/wallet' : '/leads'
      return NextResponse.redirect(new URL(fallback, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - assets
     * - api
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
