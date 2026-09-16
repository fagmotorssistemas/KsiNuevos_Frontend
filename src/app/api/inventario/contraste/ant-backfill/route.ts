import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EcuadorApiError, isEcuadorApiConfigured } from '@/lib/inventario/ecuador-api'
import { backfillMissingAnt } from '@/lib/inventario/backfillAntContraste.server'

export const maxDuration = 120

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (!isEcuadorApiConfigured()) {
    return NextResponse.json({ error: 'EcuadorAPI no está configurada' }, { status: 503 })
  }

  try {
    const body = await req.json().catch(() => null) as { exclude?: unknown } | null
    const excludePlates = Array.isArray(body?.exclude)
      ? body.exclude.filter((p): p is string => typeof p === 'string')
      : []
    const result = await backfillMissingAnt(supabase, { excludePlates })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof EcuadorApiError && (error.httpStatus === 401 || error.httpStatus === 402)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    return NextResponse.json({ error: 'No se pudo completar ANT' }, { status: 502 })
  }
}
