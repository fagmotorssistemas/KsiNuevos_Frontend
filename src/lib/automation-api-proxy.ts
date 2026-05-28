import {
  getAutomationApiUrl,
  getMetricsInternalSecret,
} from '@/lib/automation-api'

function automationUrl(path: string): string {
  return `${getAutomationApiUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

/** Guiones y rutas públicas del servidor de automatización (sin secret). */
export async function proxyAutomationScripts(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(automationUrl(path), { ...init, cache: 'no-store' })
}

export async function proxyAutomationJson(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await proxyAutomationScripts(path, init)
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data }
}

/**
 * Rutas internas del mismo servidor (`/internal/metrics/*`, etc.).
 * URL: `AUTOMATION_API_URL` → https://auto.ksinuevos.com
 * Auth: header `x-internal-secret` = `INTERNAL_API_SECRET` (o `METRICS_INTERNAL_SECRET`)
 */
export async function proxyAutomationInternal(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const secret = getMetricsInternalSecret()
  if (!secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        message:
          'Falta INTERNAL_API_SECRET en .env (mismo valor que en el servidor auto.ksinuevos.com).',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return fetch(automationUrl(path), {
    ...init,
    cache: 'no-store',
    headers: {
      'x-internal-secret': secret,
      ...(init?.headers ?? {}),
    },
  })
}
