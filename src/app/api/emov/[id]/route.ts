import { NextResponse } from 'next/server'
import { requireSatjeAccess } from '@/lib/satje-access'
import { EMOV_ID, emovRequest } from '@/lib/emov'

export const maxDuration = 30

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireSatjeAccess('EMOV')
  if ('response' in access) return access.response
  const { id } = await context.params
  if (!EMOV_ID.test(id)) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400 })
  return emovRequest(`/consultas/${id}`, access.user.id)
}
