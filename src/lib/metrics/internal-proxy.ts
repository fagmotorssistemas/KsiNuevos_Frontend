import { NextResponse } from 'next/server'

import { proxyAutomationInternal } from '@/lib/automation-api-proxy'
import { getAutomationApiUrl } from '@/lib/automation-api'

export function formatMetricsErrorMessage(value: unknown, fallback = 'Error del backend de métricas'): string {
  if (value == null) return fallback
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value instanceof Error) return value.message
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return String(value)
}

export async function proxyMetricsInternal(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: unknown; status: number } | { ok: false; response: NextResponse }> {
  try {
    const r = await proxyAutomationInternal(path, init)
    const text = await r.text()
    let data: unknown = text
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
    } else {
      data = null
    }

    if (!r.ok) {
      const message =
        data && typeof data === 'object'
          ? formatMetricsErrorMessage(
              (data as Record<string, unknown>).message ??
                (data as Record<string, unknown>).error ??
                data,
              text || r.statusText
            )
          : text || r.statusText
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            message,
            upstream: getAutomationApiUrl(),
          },
          { status: r.status >= 400 ? r.status : 502 }
        ),
      }
    }

    return { ok: true, data, status: r.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: msg, upstream: getAutomationApiUrl() },
        { status: 500 }
      ),
    }
  }
}
