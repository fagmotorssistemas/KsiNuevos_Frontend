/** Solo servidor: el navegador nunca recibe EMOV_API_KEY. */
import { NextResponse } from 'next/server'

export async function emovRequest(path: string, userId: string, input?: unknown) {
  const base = process.env.EMOV_API_URL?.trim()
  const key = process.env.EMOV_API_KEY?.trim()
  const unavailable = () => NextResponse.json(
    { error: 'La consulta EMOV todavía no está configurada.' }, { status: 503 }
  )
  if (!base || !key) return unavailable()
  let url: URL
  try {
    url = new URL(base)
    if (url.protocol !== 'https:' && !(['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) {
      return unavailable()
    }
    if (url.username || url.password || url.search || url.hash) return unavailable()
  } catch {
    return unavailable()
  }
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: input === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'x-user-id': userId },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const messages: Record<number, string> = {
        404: 'Consulta no encontrada.',
        409: 'La consulta todavía no tiene resultado.',
        429: 'Hay varias consultas en espera. Intenta más tarde.',
      }
      const status = [404, 409, 429].includes(response.status) ? response.status : 502
      return NextResponse.json({ error: messages[status] || 'No se pudo contactar con el servicio EMOV.' }, { status })
    }
    return NextResponse.json(await response.json(), {
      status: response.status, headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'El servicio EMOV no responde. Intenta nuevamente.' }, { status: 502 })
  }
}

export const EMOV_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
