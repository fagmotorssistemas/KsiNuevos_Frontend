import { NextResponse } from 'next/server'
import { requireOwnedSatjeConsulta } from '@/lib/satje-access'
import { SatjeApiError, satjeClientFacingStatus, satjeGetConsulta, satjeStoredStatus } from '@/lib/satje'

export const maxDuration = 30

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireOwnedSatjeConsulta((await context.params).id ?? '')
  if ('response' in access) return access.response
  const { supabase, user, owned } = access

  try {
    const status = await satjeGetConsulta(owned.id)
    if (status.estado && satjeStoredStatus(String(status.estado)) !== owned.status) {
      await supabase
        .from('satje_consultas')
        .update({ status: satjeStoredStatus(String(status.estado)), updated_at: new Date().toISOString() })
        .eq('id', owned.id)
        .eq('user_id', user.id)
    }
    return NextResponse.json(satjeClientFacingStatus(status))
  } catch (error) {
    if (error instanceof SatjeApiError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus >= 400 ? error.httpStatus : 502 })
    }
    const message = error instanceof Error ? error.message : 'No se pudo consultar SATJE'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
