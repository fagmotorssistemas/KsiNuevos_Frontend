import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const MARKETING_ROLES = new Set(['marketing', 'admin', 'contable'])

export async function requireMarketingSession(): Promise<
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
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error || !profile?.role) {
    return { ok: false, response: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
  }
  if (!MARKETING_ROLES.has(String(profile.role).toLowerCase().trim())) {
    return { ok: false, response: NextResponse.json({ error: 'Sin permiso de marketing' }, { status: 403 }) }
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

  const m = await requireMarketingSession()
  if (!m.ok) return { ok: false as const, response: m.response }
  return { ok: true as const, via: 'session' as const }
}
