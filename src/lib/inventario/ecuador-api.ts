import type { EcuadorPlateLookup, EcuadorPendientes, EcuadorContrastePayload, EcuadorCitation } from '@/lib/inventario/ecuadorContraste'
import { buildContrastePayload } from '@/lib/inventario/ecuadorContraste'

const DEFAULT_BASE = 'https://api.ecuadorapi.com/api/v1'
const CACHE_TTL_MS = 60 * 60 * 1000

export function getEcuadorApiKey(): string | null {
  return process.env.ECUADOR_API_KEY?.trim() || null
}

export function isEcuadorApiConfigured(): boolean {
  return Boolean(getEcuadorApiKey())
}

function getBaseUrl(): string {
  return (process.env.ECUADOR_API_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, '')
}

export function normalizeConsultaPlaca(placa: string): string | null {
  const n = placa.trim().toUpperCase().replace(/[\s-]/g, '')
  if (!/^[A-Z0-9]{5,10}$/.test(n)) return null
  return n
}

type EcuadorEnvelope<T> = {
  data: T | null
  error: boolean | null
  message: string | null
  code?: string | null
}

type PlateApiRow = {
  plate?: string
  brand?: string | null
  model?: string | null
  year?: number | null
  canton?: string | null
  last_paid_year?: number | null
  last_registration_date?: string | null
  registration_expiry_date?: string | null
  fetched_at?: string | null
  owner?: { full_name?: string | null } | null
}

export class EcuadorApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: string | null
  ) {
    super(message)
    this.name = 'EcuadorApiError'
  }
}

type CacheStore = {
  cache: Map<string, { at: number; value: unknown }>
  inflight: Map<string, Promise<unknown>>
}

function getStore(): CacheStore {
  const g = globalThis as typeof globalThis & { __ecuadorApiStore?: CacheStore }
  if (!g.__ecuadorApiStore) {
    g.__ecuadorApiStore = { cache: new Map(), inflight: new Map() }
  }
  return g.__ecuadorApiStore
}

async function ecuadorGetJson<T>(path: string, timeoutMs = 30_000): Promise<T> {
  const store = getStore()
  const cached = store.cache.get(path)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value as T
  }

  const pending = store.inflight.get(path)
  if (pending) return pending as Promise<T>

  const request = ecuadorGetJsonUncached<T>(path, timeoutMs)
    .then((value) => {
      store.cache.set(path, { at: Date.now(), value })
      return value
    })
    .finally(() => {
      store.inflight.delete(path)
    })

  store.inflight.set(path, request)
  return request
}

async function ecuadorGetJsonUncached<T>(path: string, timeoutMs: number): Promise<T> {
  const key = getEcuadorApiKey()
  if (!key) {
    throw new EcuadorApiError('EcuadorAPI no está configurada', 503, 'not_configured')
  }

  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })

  let body: EcuadorEnvelope<T> | null = null
  try {
    body = (await res.json()) as EcuadorEnvelope<T>
  } catch {
    throw new EcuadorApiError('Respuesta inválida de EcuadorAPI', 502, 'bad_gateway')
  }

  if (res.status === 404 || body?.code === 'not_found') {
    throw new EcuadorApiError(body?.message || 'Placa no encontrada en fuente oficial', 404, 'not_found')
  }
  if (res.status === 402 || body?.code === 'payment_required') {
    throw new EcuadorApiError('Sin saldo en EcuadorAPI. Recarga créditos.', 402, 'payment_required')
  }
  if (res.status === 401) {
    throw new EcuadorApiError('API key de EcuadorAPI inválida', 401, 'authentication_failed')
  }
  if (res.status === 429) {
    throw new EcuadorApiError('Límite de consultas por minuto. Espera e intenta de nuevo.', 429, 'throttled')
  }
  if (!res.ok || body?.error) {
    throw new EcuadorApiError(body?.message || `Error EcuadorAPI (${res.status})`, res.status, body?.code)
  }
  if (body?.data == null) {
    throw new EcuadorApiError('Sin datos para esa placa', 404, 'not_found')
  }
  return body.data
}

function mapPlate(d: PlateApiRow, placa: string): EcuadorPlateLookup {
  return {
    plate: d.plate || placa,
    brand: d.brand ?? null,
    model: d.model ?? null,
    year: d.year ?? null,
    ownerName: d.owner?.full_name ?? null,
    canton: d.canton ?? null,
    lastPaidYear: d.last_paid_year ?? null,
    lastRegistrationDate: d.last_registration_date ?? null,
    registrationExpiry: d.registration_expiry_date ?? null,
    fetchedAt: d.fetched_at ?? null,
  }
}

export async function fetchEcuadorPath<T = unknown>(path: string, timeoutMs = 30_000): Promise<T> {
  return ecuadorGetJson<T>(path, timeoutMs)
}

export async function fetchEcuadorPlate(placa: string): Promise<EcuadorPlateLookup> {
  const d = await ecuadorGetJson<PlateApiRow>(`/placas/${encodeURIComponent(placa)}`)
  return mapPlate(d, placa)
}

async function fetchPendientesSafe(
  placa: string,
  source: 'sri' | 'amt',
  timeoutMs?: number
): Promise<EcuadorPendientes | null> {
  try {
    return await ecuadorGetJson<EcuadorPendientes>(
      `/placas/${encodeURIComponent(placa)}/pendientes/${source}`,
      timeoutMs
    )
  } catch (e) {
    if (e instanceof EcuadorApiError && (e.httpStatus === 402 || e.httpStatus === 401 || e.httpStatus === 429)) {
      throw e
    }
    return null
  }
}

type MultasApiRow = {
  type?: string | null
  total_pending?: number | null
  pending_count?: number | null
  fetched_at?: string | null
  citations?: Array<{
    id?: string | null
    entity?: string | null
    citation_number?: string | null
    issue_date?: string | null
    notification_date?: string | null
    payment_deadline?: string | null
    points?: number | null
    fine?: number | null
    total?: number | null
    article?: string | null
    infraction?: string | null
    status?: string | null
  }> | null
}

function mapCitations(row: MultasApiRow): EcuadorCitation[] {
  return (row.citations ?? []).map((c) => ({
    id: c.id ?? null,
    entity: c.entity ?? null,
    citationNumber: c.citation_number ?? null,
    issueDate: c.issue_date ?? null,
    notificationDate: c.notification_date ?? null,
    paymentDeadline: c.payment_deadline ?? null,
    points: c.points ?? null,
    fine: c.fine ?? null,
    total: c.total ?? c.fine ?? null,
    article: c.article ?? null,
    infraction: c.infraction ?? null,
    status: c.status || 'pending',
  }))
}

async function fetchMultasSafe(placa: string): Promise<{
  citations: EcuadorCitation[]
  pendingCount: number
  pendingTotal: number
} | null> {
  try {
    const row = await ecuadorGetJson<MultasApiRow>(`/multas/${encodeURIComponent(placa)}`)
    return {
      citations: mapCitations(row),
      pendingCount: row.pending_count ?? 0,
      pendingTotal: row.total_pending ?? 0,
    }
  } catch (e) {
    if (e instanceof EcuadorApiError && (e.httpStatus === 402 || e.httpStatus === 401 || e.httpStatus === 429)) {
      throw e
    }
    return null
  }
}

function isQuito(canton: string | null): boolean {
  return /quito/i.test(canton || '')
}

export async function fetchEcuadorContraste(placa: string): Promise<EcuadorContrastePayload> {
  const lookup = await fetchEcuadorPlate(placa)
  const amtPromise = isQuito(lookup.canton)
    ? fetchPendientesSafe(placa, 'amt', 25_000)
    : Promise.resolve(null)
  const [sri, multas, amt] = await Promise.all([
    fetchPendientesSafe(placa, 'sri'),
    fetchMultasSafe(placa),
    amtPromise,
  ])
  return buildContrastePayload({
    lookup,
    sri,
    ant: null,
    amt,
    citations: multas?.citations,
    citationsPendingCount: multas?.pendingCount ?? null,
    citationsPendingTotal: multas?.pendingTotal ?? null,
  })
}
