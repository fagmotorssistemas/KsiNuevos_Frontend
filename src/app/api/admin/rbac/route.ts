import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('admin_rbac_dashboard')

  if (!error && data) {
    return NextResponse.json(data)
  }

  const fallback = await loadRbacFallback(supabase)
  if (fallback) {
    return NextResponse.json(fallback)
  }

  const usersOnly = await loadProfilesOnly(supabase)
  return NextResponse.json(
    {
      error: error?.message ?? 'No se pudo cargar el panel RBAC',
      modules: [],
      roles: [],
      ...usersOnly,
    },
    { status: 500 }
  )
}

const PROFILE_STAFF_SELECT = 'id, full_name, phone, role, status'

async function loadProfilesOnly(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(PROFILE_STAFF_SELECT)
    .neq('role', 'cliente')
    .order('full_name')

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: null as string | null,
    catalog_roles: [] as { id: string; slug: string; name: string; base_role: string }[],
  }))

  return {
    users,
    stats: {
      departments: 0,
      roles: 0,
      modules: 0,
      active_permissions: 0,
      staff_users: users.length,
    },
    profilesError: error?.message,
  }
}

async function loadRbacFallback(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  try {
    const { data: modules, error: mErr } = await supabase.from('modules').select('*').order('sort_order')
    if (mErr) return null

    const { data: submodules, error: sErr } = await supabase.from('submodules').select('*').order('sort_order')
    if (sErr) return null

    const { data: roles, error: rErr } = await supabase.from('roles').select('*').order('base_role').order('name')
    if (rErr) return null

    const { data: rp, error: pErr } = await supabase.from('role_permissions').select('role_id, can_read')
    if (pErr) return null

    const { data: profiles, error: uErr } = await supabase
      .from('profiles')
      .select(PROFILE_STAFF_SELECT)
      .neq('role', 'cliente')
      .order('full_name')

    if (uErr) return null

    const { data: prs, error: prErr } = await supabase
      .from('profile_roles')
      .select('profile_id, role_id, roles(id, slug, name, base_role)')
    if (prErr) return null

    const subsByModule = new Map<string, NonNullable<typeof submodules>>()
    for (const s of submodules ?? []) {
      const list = subsByModule.get(s.module_id) ?? []
      list.push(s)
      subsByModule.set(s.module_id, list)
    }

    const permCounts = new Map<string, number>()
    for (const row of rp ?? []) {
      if (row.can_read) {
        permCounts.set(row.role_id, (permCounts.get(row.role_id) ?? 0) + 1)
      }
    }

    const userCountByRole = new Map<string, number>()
    const catalogByProfile = new Map<string, { id: string; slug: string; name: string; base_role: string }[]>()
    for (const pr of prs ?? []) {
      userCountByRole.set(pr.role_id, (userCountByRole.get(pr.role_id) ?? 0) + 1)
      const role = pr.roles as { id: string; slug: string; name: string; base_role: string } | null
      if (!role) continue
      const list = catalogByProfile.get(pr.profile_id) ?? []
      list.push(role)
      catalogByProfile.set(pr.profile_id, list)
    }

    return {
      modules: (modules ?? []).map((m) => ({
        ...m,
        submodules: subsByModule.get(m.id) ?? [],
      })),
      roles: (roles ?? []).map((r) => ({
        ...r,
        active_permissions: permCounts.get(r.id) ?? 0,
        user_count: userCountByRole.get(r.id) ?? 0,
      })),
      users: (profiles ?? []).map((p) => ({
        ...p,
        email: null as string | null,
        catalog_roles: catalogByProfile.get(p.id) ?? [],
      })),
      stats: {
        departments: new Set((roles ?? []).map((r) => r.base_role)).size,
        roles: roles?.length ?? 0,
        modules: modules?.length ?? 0,
        active_permissions: [...permCounts.values()].reduce((a, b) => a + b, 0),
        staff_users: profiles?.length ?? 0,
      },
    }
  } catch {
    return null
  }
}
