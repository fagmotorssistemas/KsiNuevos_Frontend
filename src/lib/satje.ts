/**
 * Cliente SATJE solo para Route Handlers / servidor.
 * No importar desde componentes cliente.
 */

export class SatjeApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly body: unknown = null
  ) {
    super(message)
    this.name = 'SatjeApiError'
  }
}

export type SatjeEstado =
  | 'pendiente'
  | 'en_proceso'
  | 'esperando_captcha'
  | 'completada'
  | 'error'

const STORED_STATUSES: SatjeEstado[] = [
  'pendiente',
  'en_proceso',
  'esperando_captcha',
  'completada',
  'error',
]

export function satjeStoredStatus(estado: string): SatjeEstado {
  return STORED_STATUSES.includes(estado as SatjeEstado) ? (estado as SatjeEstado) : 'pendiente'
}

export type SatjeCreateInput = {
  nombre: string
  cedula?: string
  placa?: string
  ruc?: string
}

export type SatjeConsultaEstado = {
  id: string
  estado: SatjeEstado | string
  mensaje?: string | null
  captchaUrl?: string | null
  /** CAPTCHA actual (1-based) si el scraper lo informa. */
  captchaActual?: number | null
  captchasTotal?: number
  etapa?: string | null
}

function getBaseUrl(): string {
  const url = process.env.SATJE_API_URL?.trim()
  if (!url) {
    throw new SatjeApiError('SATJE_API_URL no está configurada', 503)
  }
  return url.replace(/\/$/, '')
}

function getApiKey(): string {
  const key = process.env.SATJE_API_KEY?.trim()
  if (!key) {
    throw new SatjeApiError('SATJE_API_KEY no está configurada', 503)
  }
  return key
}

function satjeHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': getApiKey(),
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickCaptchaUrl(body: Record<string, unknown> | null): string | null {
  if (!body) return null
  const raw = body.captchaUrl ?? body.captcha_url
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function pickPositiveInt(rec: Record<string, unknown> | null, keys: string[]): number | null {
  if (!rec) return null
  for (const key of keys) {
    const raw = rec[key]
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (Number.isInteger(n) && n > 0) return n
  }
  return null
}

function pickText(rec: Record<string, unknown> | null, keys: string[]): string | null {
  if (!rec) return null
  for (const key of keys) {
    const raw = rec[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return null
}

function progressFromMensaje(mensaje: string | null): { actual: number; total: number } | null {
  if (!mensaje) return null
  const match = mensaje.match(/(\d+)\s*(?:de|\/)\s*(\d+)/i)
  if (!match) return null
  const actual = Number(match[1])
  const total = Number(match[2])
  if (!Number.isInteger(actual) || !Number.isInteger(total) || actual < 1 || total < 1) return null
  return { actual, total }
}

const DEFAULT_CAPTCHA_TOTAL = 2

function pickProgress(rec: Record<string, unknown> | null, mensaje: string | null): {
  captchaActual: number | null
  captchasTotal: number
  etapa: string | null
} {
  const nested = asRecord(rec?.captcha) ?? asRecord(rec?.progreso)
  const fromMsg = progressFromMensaje(mensaje)
  const captchasTotal =
    pickPositiveInt(nested, ['captchas_total', 'total_captchas', 'totalCaptchas', 'pasos', 'total_pasos', 'total']) ??
    pickPositiveInt(rec, ['captchas_total', 'total_captchas', 'totalCaptchas', 'total_pasos']) ??
    fromMsg?.total ??
    DEFAULT_CAPTCHA_TOTAL
  const captchaActual =
    pickPositiveInt(nested, ['captcha_actual', 'captchaActual', 'captcha_n', 'n', 'paso', 'paso_actual', 'step']) ??
    pickPositiveInt(rec, ['captcha_actual', 'captchaActual', 'captcha_n', 'paso', 'paso_actual', 'pasoActual']) ??
    fromMsg?.actual ??
    null
  const etapa =
    pickText(nested, ['etapa', 'paso_nombre', 'fuente_actual', 'consulta_actual', 'fuente']) ??
    pickText(rec, ['etapa', 'paso_nombre', 'fuente_actual', 'consulta_actual'])
  return { captchaActual, captchasTotal, etapa }
}

function normalizeEstado(body: unknown, fallbackId: string): SatjeConsultaEstado {
  const rec = asRecord(body)
  const id = (typeof rec?.id === 'string' && rec.id.trim()) || fallbackId
  const estado = typeof rec?.estado === 'string' && rec.estado.trim() ? rec.estado.trim() : 'pendiente'
  const mensaje = typeof rec?.mensaje === 'string' ? rec.mensaje : null
  const progress = pickProgress(rec, mensaje)
  return {
    id,
    estado,
    mensaje,
    captchaUrl: pickCaptchaUrl(rec),
    captchaActual: progress.captchaActual,
    captchasTotal: progress.captchasTotal,
    etapa: progress.etapa,
  }
}

async function satjeFetch(path: string, init?: RequestInit): Promise<{ status: number; data: unknown }> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...satjeHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, data }
}

function throwIfFailed(status: number, data: unknown, fallback: string): void {
  if (status >= 200 && status < 300) return
  const rec = asRecord(data)
  const message =
    (typeof rec?.mensaje === 'string' && rec.mensaje.trim()) ||
    (typeof rec?.error === 'string' && rec.error.trim()) ||
    (typeof rec?.detail === 'string' && rec.detail.trim()) ||
    fallback
  throw new SatjeApiError(message, status, data)
}

export async function satjeCreateConsulta(input: SatjeCreateInput): Promise<SatjeConsultaEstado> {
  const { status, data } = await satjeFetch('/consultas', {
    method: 'POST',
    body: JSON.stringify({
      nombre: input.nombre,
      placa: input.placa ?? '',
      cedula: input.cedula ?? '',
      ruc: input.ruc ?? '',
    }),
  })
  throwIfFailed(status, data, 'No se pudo crear la consulta SATJE')
  const rec = asRecord(data)
  const id = typeof rec?.id === 'string' ? rec.id : ''
  if (!id) throw new SatjeApiError('El scraper no devolvió un id de consulta', 502, data)
  return normalizeEstado(data, id)
}

export async function satjeGetConsulta(id: string): Promise<SatjeConsultaEstado> {
  const { status, data } = await satjeFetch(`/consultas/${encodeURIComponent(id)}`)
  throwIfFailed(status, data, 'No se pudo consultar el estado SATJE')
  return normalizeEstado(data, id)
}

/** true si el scraper ya no tiene esa consulta (404). */
export async function satjeConsultaMissing(id: string): Promise<boolean> {
  const { status } = await satjeFetch(`/consultas/${encodeURIComponent(id)}`)
  return status === 404
}

export async function satjeGetResultado(id: string): Promise<unknown> {
  const { status, data } = await satjeFetch(`/consultas/${encodeURIComponent(id)}/resultado`)
  if (status === 409) {
    throw new SatjeApiError('La consulta aún no está completada', 409, data)
  }
  throwIfFailed(status, data, 'No se pudo leer el resultado SATJE')
  return data
}
