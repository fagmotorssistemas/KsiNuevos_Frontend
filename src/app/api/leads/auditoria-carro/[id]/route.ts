import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  canAccessSubmodule,
  createPermissionContext,
  fetchCatalogBaseRole,
  fetchPermissionMap,
} from '@/lib/permissions'
import { loadAuditoriaCarroLeads } from '@/lib/leads/auditoria-carro-data'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f-]{36}$/i

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ message: 'Carro inválido' }, { status: 400 })
  }

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
    return NextResponse.json({ message: 'Sin acceso a la auditoría por carro' }, { status: 403 })
  }

  try {
    return NextResponse.json(await loadAuditoriaCarroLeads(id))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer los leads del carro'
    return NextResponse.json({ message }, { status: 500 })
  }
}
