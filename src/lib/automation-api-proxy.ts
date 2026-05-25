import { getAutomationApiUrl } from '@/lib/automation-api'

export async function proxyAutomationScripts(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${getAutomationApiUrl()}${path.startsWith('/') ? path : `/${path}`}`
  return fetch(url, { ...init, cache: 'no-store' })
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
