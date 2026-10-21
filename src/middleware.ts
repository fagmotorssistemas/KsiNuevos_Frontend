import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { PUBLIC_PATHS } from '@/lib/nav/publicPaths'
import {
  rowsToPermissionMap,
  type EffectivePermissionRow,
  isRouteAllowed,
  isTallerOnlyAccess,
  resolveAccessDeniedRedirect,
  getProtectedRoutePrefixes,
  fetchCatalogBaseRole,
  createPermissionContext,
  isFullSystemAdmin,
} from '@/lib/permissions'

/** Derivado del catálogo RBAC (`rbacCatalog.ts`); se actualiza al sincronizar permisos */
const RUTAS_PROTEGIDAS_PREFIX = getProtectedRoutePrefixes()

/**
 * Tope para validar sesión + permisos. Vercel corta el middleware a los 25 s y supabase-js
 * reintenta el refresh del token hasta 30 s si la red falla: mejor responder antes.
 */
const AUTH_DEADLINE_MS = 10_000

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS_PREFIX.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Páginas públicas: no se consulta la sesión. El cliente del navegador renueva el token
  // por su cuenta y ningún Server Component público la lee.
  if (!esRutaProtegida(pathname)) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Patrón de @supabase/ssr: la página de esta misma petición ve el token renovado.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  /**
   * Toda respuesta que no sea `response` debe llevar las cookies que Supabase renovó o borró:
   * si se pierden, el navegador reusa un refresh token ya rotado ("Invalid Refresh Token")
   * o se queda con la sesión vencida y el error se repite en cada página.
   */
  const conCookiesDeSesion = <T extends NextResponse>(res: T): T => {
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie))
    return res
  }
  const redirigir = (target: string | URL) =>
    conCookiesDeSesion(NextResponse.redirect(new URL(target, request.url)))

  const access = await withDeadline(
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (!user) return { user: null, authCaido: isAuthRetryableFetchError(error) } as const

      const [{ data: profile }, catalogBaseRole, { data: permRows }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        fetchCatalogBaseRole(supabase, user.id),
        supabase.rpc('get_my_effective_permissions'),
      ])
      return { user, profile, catalogBaseRole, permRows } as const
    })(),
    AUTH_DEADLINE_MS
  )

  // Supabase lento o caído: no mandar al login a alguien que sí tiene sesión.
  if (access === 'timeout' || (!access.user && access.authCaido)) {
    console.error(
      `[middleware] Supabase no respondió (${access === 'timeout' ? `>${AUTH_DEADLINE_MS} ms` : 'error de red'}): ${pathname}`
    )
    return conCookiesDeSesion(servicioLentoResponse())
  }

  if (!access.user) {
    const urlLogin = new URL('/login', request.url)
    urlLogin.searchParams.set('redirect', pathname)
    return redirigir(urlLogin)
  }

  const { profile, catalogBaseRole, permRows } = access

  if (profile?.role === 'cliente') {
    return redirigir(PUBLIC_PATHS.home)
  }

  const map = rowsToPermissionMap((permRows ?? []) as EffectivePermissionRow[])
  const ctx = createPermissionContext(profile?.role ?? null, map, catalogBaseRole)

  if (pathname === '/admin/permisos' || pathname.startsWith('/admin/permisos/')) {
    if (!isFullSystemAdmin(ctx)) {
      return redirigir(PUBLIC_PATHS.home)
    }
    return response
  }

  if (!isRouteAllowed(pathname, ctx)) {
    let target = resolveAccessDeniedRedirect(pathname, ctx)
    if (!isRouteAllowed(target, ctx) && profile?.role) {
      target = resolveAccessDeniedRedirect(
        pathname,
        createPermissionContext(profile.role, map, catalogBaseRole)
      )
    }
    if (!isRouteAllowed(target, ctx)) {
      target = PUBLIC_PATHS.home
    }
    if (isTallerOnlyAccess(ctx) && (target === PUBLIC_PATHS.home || target === '/home')) {
      target = '/taller/dashboard'
    }
    return redirigir(target)
  }

  return response
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Página liviana que se recarga sola, en vez del error 504 de Vercel tras 25 s. */
function servicioLentoResponse(): NextResponse {
  return new NextResponse(
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="refresh" content="5"><title>Reintentando…</title></head>' +
      '<body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#334155;background:#f8fafc">' +
      '<p>El servidor está tardando en responder. Reintentando en unos segundos…</p></body></html>',
    {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'retry-after': '5',
        'cache-control': 'no-store',
      },
    }
  )
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|ffmpeg/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)',
  ],
}
