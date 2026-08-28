import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { classifyConsultaQuery, runUnifiedConsulta } from '@/lib/inventario/consultaUnificada'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { query?: string } = {}
  try {
    body = (await req.json()) as { query?: string }
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const classified = classifyConsultaQuery(body.query ?? '')
  if ('error' in classified) {
    return NextResponse.json({ error: classified.error }, { status: 400 })
  }

  try {
    const data = await runUnifiedConsulta(supabase, body.query ?? '')
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la consulta'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
