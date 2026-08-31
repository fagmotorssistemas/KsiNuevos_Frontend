import { NextResponse } from 'next/server'
import { requireSatjeAccess } from '@/lib/satje-access'
import { SatjeApiError, satjeGetConsulta, satjeStoredStatus } from '@/lib/satje'

export const maxDuration = 30

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireSatjeAccess()
  if ('response' in access) return access.response
  const { supabase, user } = access
  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })
  }

  const { data: owned } = await supabase
    .from('satje_consultas')
    .select('id, user_id, status')
    .eq('id', id.trim())
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owned) {
    return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })
  }

  try {
    const status = await satjeGetConsulta(owned.id)
    if (status.estado && satjeStoredStatus(String(status.estado)) !== owned.status) {
      await supabase
        .from('satje_consultas')
        .update({ status: satjeStoredStatus(String(status.estado)), updated_at: new Date().toISOString() })
        .eq('id', owned.id)
        .eq('user_id', user.id)
    }
    return NextResponse.json({
      id: status.id,
      estado: status.estado,
      mensaje: status.mensaje,
      captchaUrl: status.captchaUrl,
      captchaActual: status.captchaActual,
      captchasTotal: status.captchasTotal,
      etapa: status.etapa,
    })
  } catch (error) {
    if (error instanceof SatjeApiError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus >= 400 ? error.httpStatus : 502 })
    }
    const message = error instanceof Error ? error.message : 'No se pudo consultar SATJE'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
