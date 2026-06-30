import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  canAccessModule,
  canAccessSubmodule,
  isAppAdminRole,
  MODULE_SLUGS,
  type PermissionContext,
} from '@/lib/permissions'
import { hasAnyReadPermission } from '@/lib/permissions/access'
import { fetchPermissionMap } from '@/lib/permissions/fetch'

/** Rutas API de marketing → submódulo RBAC (mismo criterio que el sidebar). */
const MARKETING_API_PATH_ACCESS: { prefix: string; submodule: string }[] = [
  { prefix: '/api/scripts', submodule: 'plan-videos' },
  { prefix: '/api/videos', submodule: 'video-automation' },
  { prefix: '/api/marketing/metrics', submodule: 'metricas-campana' },
  { prefix: '/api/marketing/capi', submodule: 'metricas-campana' },
  { prefix: '/api/marketing/noticiero', submodule: 'blog-posts' },
  { prefix: '/api/marketing/inventory-video-dashboard', submodule: 'metricas-campana' },
]

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function resolveMarketingApiSubmodule(pathname: string): string | null {
  for (const rule of MARKETING_API_PATH_ACCESS) {
    if (pathMatchesPrefix(pathname, rule.prefix)) return rule.submodule
  }
  return null
}

function staffMarketingApiEnumAllowed(ctx: PermissionContext): boolean {
  if (hasAnyReadPermission(ctx.map)) return false
  const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()
  return role === 'marketing' || role === 'contable'
}

function canAccessMarketingApi(pathname: string, ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  if (staffMarketingApiEnumAllowed(ctx)) return true

  const submodule = resolveMarketingApiSubmodule(pathname)
  if (submodule) return canAccessSubmodule(ctx, submodule)
  return canAccessModule(ctx, MODULE_SLUGS.marketing)
}

export async function requireMarketingSession(request: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (error || !profile?.role) {
    return { ok: false, response: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
  }

  const map = await fetchPermissionMap(supabase)
  const ctx: PermissionContext = { baseRole: profile.role, map }
  const pathname = new URL(request.url).pathname

  if (!canAccessMarketingApi(pathname, ctx)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sin permiso de marketing' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id }
}

/**
 * Cron de Vercel o sesión marketing.
 * - Si `CRON_SECRET` está definido: acepta `Authorization: Bearer …` o `?secret=` (Vercel lo inyecta al cron si configuras la env).
 * - Si no hay `CRON_SECRET`: acepta cabecera `x-vercel-cron: 1` (invocación oficial de Cron en Vercel). En producción conviene definir `CRON_SECRET`.
 */
export async function authorizeCronOrMarketing(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')
  const url = new URL(request.url)
  const q = url.searchParams.get('secret')
  const vercelCron = request.headers.get('x-vercel-cron') === '1'

  if (secret && (auth === `Bearer ${secret}` || q === secret)) {
    return { ok: true as const, via: 'cron' as const }
  }

  if (!secret && vercelCron) {
    return { ok: true as const, via: 'vercel-cron' as const }
  }

  const m = await requireMarketingSession(request)
  if (!m.ok) return { ok: false as const, response: m.response }
  return { ok: true as const, via: 'session' as const }
}
