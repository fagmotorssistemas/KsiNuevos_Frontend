import { NextResponse } from 'next/server'
import { requireOwnedSatjeConsulta } from '@/lib/satje-access'
import { SatjeApiError, satjeGetConsulta, satjeSafeCaptchaRedirect } from '@/lib/satje'

export const maxDuration = 30

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireOwnedSatjeConsulta((await context.params).id ?? '')
  if ('response' in access) return access.response

  try {
    const status = await satjeGetConsulta(access.owned.id)
    const target = status.captchaUrl ? satjeSafeCaptchaRedirect(status.captchaUrl) : null
    if (!target) {
      return NextResponse.json({ error: 'CAPTCHA no disponible' }, { status: 409 })
    }
    const response = NextResponse.redirect(target, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    if (error instanceof SatjeApiError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus >= 400 ? error.httpStatus : 502 })
    }
    const message = error instanceof Error ? error.message : 'No se pudo abrir el CAPTCHA'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
