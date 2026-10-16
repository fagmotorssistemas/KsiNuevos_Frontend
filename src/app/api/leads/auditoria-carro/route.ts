import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  canAccessSubmodule,
  createPermissionContext,
  fetchCatalogBaseRole,
  fetchPermissionMap,
} from '@/lib/permissions'
import { loadAuditoriaCarro } from '@/lib/leads/auditoria-carro-data'
import type { AuditoriaCarroSort } from '@/lib/leads/auditoria-carro-types'

export const dynamic = 'force-dynamic'

const SORTS = new Set<AuditoriaCarroSort>([
  'conversaciones',
  'agendo',
  'dias_en_patio',
  'gasto_ads',
  'visitas_patio',
  'vio_precio',
  'pidieron_rebaja',
])

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams
  const sortRaw = params.get('sort')
  const sort = sortRaw && SORTS.has(sortRaw as AuditoriaCarroSort) ? (sortRaw as AuditoriaCarroSort) : 'conversaciones'
  const orderRaw = params.get('order')
  const order = orderRaw === 'asc' ? 'asc' : 'desc'
  const soloConChat = params.get('solo_con_chat') !== '0'
  const status = params.get('status')

  try {
    const payload = await loadAuditoriaCarro({
      status,
      soloConChat,
      sort,
      order,
    })
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer la auditoría por carro'
    return NextResponse.json({ message }, { status: 500 })
  }
}
