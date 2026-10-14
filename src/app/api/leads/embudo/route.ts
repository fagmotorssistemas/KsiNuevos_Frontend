import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { canAccessSubmodule, createPermissionContext, fetchCatalogBaseRole, fetchPermissionMap } from '@/lib/permissions'
import { loadEmbudo } from '@/lib/leads/embudo-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const [{ data: profile }, map, catalogBaseRole] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    fetchPermissionMap(supabase),
    fetchCatalogBaseRole(supabase, user.id),
  ])
  const ctx = createPermissionContext(profile?.role ?? null, map, catalogBaseRole)
  if (!canAccessSubmodule(ctx, 'leads-pipeline')) {
    return NextResponse.json({ message: 'Sin acceso al embudo comercial' }, { status: 403 })
  }

  try {
    const payload = await loadEmbudo()
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer el embudo'
    return NextResponse.json({ message }, { status: 500 })
  }
}
