import { createServerClient } from '@supabase/ssr'
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

  const [{ data: profile }, catalogBaseRole, { data: permRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    fetchCatalogBaseRole(supabase, user.id),
    supabase.rpc('get_my_effective_permissions'),
  ])

  if (profile?.role === 'cliente') {
    return NextResponse.redirect(new URL(PUBLIC_PATHS.home, request.url))
  }

  const map = rowsToPermissionMap((permRows ?? []) as EffectivePermissionRow[])
  const ctx = createPermissionContext(profile?.role ?? null, map, catalogBaseRole)

  if (pathname === '/admin/permisos' || pathname.startsWith('/admin/permisos/')) {
    if (!isFullSystemAdmin(ctx)) {
      return NextResponse.redirect(new URL(PUBLIC_PATHS.home, request.url))
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
    return NextResponse.redirect(new URL(target, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|ffmpeg/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)',
  ],
}
