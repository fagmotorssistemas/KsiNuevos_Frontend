/**
 * Proxy async a jobs internos de video en Nest (compress / normalize).
 * Mismo patrón: POST → 202 + poll status, o 200 sync.
 */

export const NEST_VIDEO_POLL_INTERVAL_MS = 3_000
export const NEST_VIDEO_POLL_TIMEOUT_MS = 300_000

export type NestVideoJobStatus =
  | { status: 'processing' | 'not_found' }
  | { status: 'done'; result: Record<string, unknown> }
  | { status: 'failed'; error?: string }

export function getNestInternalConfig(): { nestBase: string; secret: string } | null {
  const nestBase = process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '')
  const secret = process.env.INTERNAL_API_SECRET
  if (!nestBase || !secret) return null
  return { nestBase, secret }
}

export async function runNestVideoJob(options: {
  label: string
  jobId: string
  startPath: string
  statusPath: string
  body: Record<string, unknown>
  emptyResult: Record<string, unknown>
}): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; result: Record<string, unknown> }> {
  const cfg = getNestInternalConfig()
  if (!cfg) {
    console.error(`[${options.label}] Faltan BACKEND_INTERNAL_URL o INTERNAL_API_SECRET`)
    return { ok: false, result: options.emptyResult }
  }

  const { nestBase, secret } = cfg
  console.log(
    `[${options.label}][${options.jobId}] Iniciando en Nest…`
  )

  const startRes = await fetch(`${nestBase}${options.startPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(options.body),
  })

  if (startRes.ok && startRes.status === 200) {
    const result = (await startRes.json()) as Record<string, unknown>
    console.log(`[${options.label}][${options.jobId}] Nest sync OK:`, JSON.stringify(result))
    return { ok: true, result }
  }

  if (!startRes.ok && startRes.status !== 202) {
    const text = await startRes.text()
    console.error(
      `[${options.label}][${options.jobId}] Nest start ${startRes.status}: ${text.slice(0, 500)}`
    )
    return { ok: false, result: options.emptyResult }
  }

  console.log(
    `[${options.label}][${options.jobId}] Nest 202 — polling cada ${NEST_VIDEO_POLL_INTERVAL_MS}ms`
  )

  const deadline = Date.now() + NEST_VIDEO_POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, NEST_VIDEO_POLL_INTERVAL_MS))

    const statusRes = await fetch(`${nestBase}${options.statusPath}`, {
      headers: { 'x-internal-secret': secret },
    })

    if (!statusRes.ok) {
      const text = await statusRes.text()
      console.warn(
        `[${options.label}][${options.jobId}] Status poll HTTP ${statusRes.status}: ${text.slice(0, 200)}`
      )
      continue
    }

    let status: NestVideoJobStatus
    try {
      status = (await statusRes.json()) as NestVideoJobStatus
    } catch {
      continue
    }

    if (status.status === 'done') {
      console.log(
        `[${options.label}][${options.jobId}] Nest done:`,
        JSON.stringify(status.result)
      )
      return { ok: true, result: status.result }
    }

    if (status.status === 'failed') {
      const errMsg = status.error ?? `${options.label} falló en Nest`
      console.error(`[${options.label}][${options.jobId}] Nest failed: ${errMsg}`)
      return {
        ok: false,
        result: { ...options.emptyResult, errors: [errMsg] },
      }
    }
  }

  console.error(`[${options.label}][${options.jobId}] Timeout tras ${NEST_VIDEO_POLL_TIMEOUT_MS}ms`)
  return {
    ok: false,
    result: { ...options.emptyResult, errors: [`Timeout esperando ${options.label}`] },
  }
}
