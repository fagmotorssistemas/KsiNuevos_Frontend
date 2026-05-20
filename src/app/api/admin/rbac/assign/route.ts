import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
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

  const body = (await request.json()) as { profileId?: string; roleId?: string }
  if (!body.profileId || !body.roleId) {
    return NextResponse.json({ error: 'profileId y roleId requeridos' }, { status: 400 })
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from('roles')
    .select('id, base_role')
    .eq('id', body.roleId)
    .single()

  if (roleErr || !roleRow) {
    return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
  }

  const enumRole = roleRow.base_role
  if (
    enumRole === 'admin' ||
    enumRole === 'vendedor' ||
    enumRole === 'cliente' ||
    enumRole === 'marketing' ||
    enumRole === 'finanzas' ||
    enumRole === 'contable' ||
    enumRole === 'abogado' ||
    enumRole === 'taller'
  ) {
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role: enumRole })
      .eq('id', body.profileId)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }
  }

  const { error: delErr } = await supabase.from('profile_roles').delete().eq('profile_id', body.profileId)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const { error: insErr } = await supabase.from('profile_roles').insert({
    profile_id: body.profileId,
    role_id: body.roleId,
  })
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const { error: seedErr } = await supabase.rpc('seed_profile_permissions_from_role', {
    p_profile_id: body.profileId,
    p_role_id: body.roleId,
  })
  if (seedErr) {
    return NextResponse.json({ error: seedErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
