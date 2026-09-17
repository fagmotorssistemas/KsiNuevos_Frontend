import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EcuadorApiError, isEcuadorApiConfigured, normalizeConsultaPlaca } from '@/lib/inventario/ecuador-api'
import { retryContrasteFuente, type ContrasteFuente } from '@/lib/inventario/retryContrasteFuente.server'

export const maxDuration = 90

export async function POST(
  req: Request,
  context: { params: Promise<{ placa: string }> }
) {
  const access = await createServerSupabaseClient()
  const {
    data: { user },
  } = await access.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!isEcuadorApiConfigured()) {
    return NextResponse.json({ error: 'EcuadorAPI no está configurada' }, { status: 503 })
  }

  const { placa: rawPlaca } = await context.params
  const placa = normalizeConsultaPlaca(decodeURIComponent(rawPlaca || ''))
  if (!placa) {
    return NextResponse.json({ error: 'Placa inválida. Usa letras y números, sin guiones.' }, { status: 400 })
  }

  const body = await req.json().catch(() => null) as { fuente?: unknown; consultaId?: unknown } | null
  const fuente = body?.fuente === 'sri' || body?.fuente === 'ant' ? (body.fuente as ContrasteFuente) : null
  if (!fuente) return NextResponse.json({ error: 'Indica si reintentas ANT o SRI.' }, { status: 400 })
  const consultaId = typeof body?.consultaId === 'string' ? body.consultaId : null

  try {
    const result = await retryContrasteFuente(access, placa, fuente, consultaId)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof EcuadorApiError) {
      const status = error.httpStatus >= 400 && error.httpStatus < 600 ? error.httpStatus : 502
      return NextResponse.json({ error: error.message }, { status })
    }
    const message = error instanceof Error ? error.message : `No se pudo reintentar ${fuente.toUpperCase()}.`
    const status = /Primero consulta|no tiene datos|Indica/i.test(message) ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
