import { NextResponse } from 'next/server'
import { requireOwnedSatjeConsulta } from '@/lib/satje-access'
import { satjeContinuarCaptcha } from '@/lib/satje'

export const maxDuration = 30

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireOwnedSatjeConsulta((await context.params).id ?? '')
  if ('response' in access) return access.response

  const result = await satjeContinuarCaptcha(access.owned.id)
  if (result === 'ausente') {
    return NextResponse.json({ ok: false, soportado: false }, { status: 404 })
  }
  return NextResponse.json({ ok: result === 'ok', soportado: true })
}
