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

type ApiPerson = {
  full_name?: string | null
  id?: string | null
  sri?: { full_name?: string | null; id?: string | null } | null
  ant?: { full_name?: string | null; id?: string | null } | null
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
  owner?: ApiPerson | null
  owner_sri?: ApiPerson | null
  owner_ant?: ApiPerson | null
  sri_owner?: ApiPerson | null
  ant_owner?: ApiPerson | null
}

function personName(person: ApiPerson | null | undefined): string | null {
  const name = person?.full_name?.trim()
  return name || null
}

function personId(person: ApiPerson | null | undefined): string | null {
  const id = person?.id?.trim()
  return id || null
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

  const raw = await res.text()
  let body: EcuadorEnvelope<T> | null = null
  if (raw) {
    try {
      body = JSON.parse(raw) as EcuadorEnvelope<T>
    } catch {
      throw new EcuadorApiError('Respuesta inválida de EcuadorAPI', 502, 'bad_gateway')
    }
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
  const ownerNameSri =
    personName(d.sri_owner) || personName(d.owner_sri) || personName(d.owner?.sri) || personName(d.owner)
  const ownerNameAnt = personName(d.ant_owner) || personName(d.owner_ant) || personName(d.owner?.ant)
  const ownerIdSri = personId(d.sri_owner) || personId(d.owner_sri) || personId(d.owner?.sri) || personId(d.owner)
  const ownerIdAnt = personId(d.ant_owner) || personId(d.owner_ant) || personId(d.owner?.ant)
  return {
    plate: d.plate || placa,
    brand: d.brand ?? null,
    model: d.model ?? null,
    year: d.year ?? null,
    ownerName: ownerNameSri,
    ownerNameSri,
    ownerNameAnt,
    ownerIdSri,
    ownerIdAnt,
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

function isBillingOrAuthError(e: unknown): boolean {
  return e instanceof EcuadorApiError && (e.httpStatus === 402 || e.httpStatus === 401 || e.httpStatus === 429)
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTimeoutError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = 'name' in e ? String(e.name) : ''
  return name === 'TimeoutError' || name === 'AbortError'
}

async function ecuadorGetJsonRetry<T>(path: string, timeoutMs: number, retries = 1): Promise<T> {
  try {
    return await ecuadorGetJson<T>(path, timeoutMs)
  } catch (e) {
    if (retries < 1 || (e instanceof EcuadorApiError && (e.httpStatus === 401 || e.httpStatus === 402))) {
      throw e
    }
    if (e instanceof EcuadorApiError && e.httpStatus === 429) {
      await wait(2000)
      return ecuadorGetJsonRetry<T>(path, timeoutMs, retries - 1)
    }
    // EcuadorAPI sigue scrapeando ANT tras nuestro corte; el retry suele salir de su caché.
    if (isTimeoutError(e) || (e instanceof EcuadorApiError && (e.httpStatus === 502 || e.httpStatus === 504))) {
      await wait(8000)
      return ecuadorGetJsonRetry<T>(path, Math.min(timeoutMs, 20_000), retries - 1)
    }
    await wait(800)
    return ecuadorGetJsonRetry<T>(path, timeoutMs, retries - 1)
  }
}

async function fetchPendientesSafe(
  placa: string,
  source: 'sri' | 'amt' | 'ant',
  timeoutMs?: number
): Promise<EcuadorPendientes | null> {
  try {
    return await ecuadorGetJsonRetry<EcuadorPendientes>(
      `/placas/${encodeURIComponent(placa)}/pendientes/${source}`,
      timeoutMs ?? 30_000
    )
  } catch (e) {
    if (isBillingOrAuthError(e)) throw e
    return null
  }
}

type MultasApiRow = {
  type?: string | null
  total_pending?: number | null
  pending_count?: number | null
  fetched_at?: string | null
  owner_id?: string | null
  owner_name?: string | null
  owner?: ApiPerson | null
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
    plate?: string | null
    placa?: string | null
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
    plate: (c.plate || c.placa || '').replace(/[\s-]/g, '').toUpperCase() || null,
  }))
}

function ownerCedula(id: string | null | undefined): string | null {
  const digits = (id || '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 13 && digits.endsWith('001')) return digits.slice(0, 10)
  return null
}

function normalizeCitationPlate(value: string | null | undefined): string {
  return (value || '').replace(/[\s-]/g, '').toUpperCase()
}

async function fetchMultasRow(path: string, timeoutMs: number): Promise<MultasApiRow | null> {
  try {
    return await ecuadorGetJson<MultasApiRow>(path, timeoutMs)
  } catch (e) {
    if (isBillingOrAuthError(e)) throw e
    if (e instanceof EcuadorApiError && e.httpStatus === 404) return null
    if (isTimeoutError(e) || (e instanceof EcuadorApiError && (e.httpStatus === 502 || e.httpStatus === 504))) {
      await wait(8000)
      try {
        return await ecuadorGetJsonUncached<MultasApiRow>(path, Math.min(timeoutMs, 20_000))
      } catch (retryError) {
        if (isBillingOrAuthError(retryError)) throw retryError
        return null
      }
    }
    return null
  }
}

function snapshotFromMultasRow(
  placa: string,
  row: MultasApiRow,
  scopeHint: 'plate' | 'owner'
): {
  ant: EcuadorPendientes | null
  citations: EcuadorCitation[]
  pendingCount: number
  pendingTotal: number
  ownerName: string | null
  ownerId: string | null
  historyStatus: 'ok'
  citationsScope: 'plate' | 'owner'
} {
  const all = mapCitations(row)
  const target = normalizeCitationPlate(placa)
  const withPlate = all.filter((citation) => normalizeCitationPlate(citation.plate))
  const citations = withPlate.length > 0 ? all.filter((citation) => normalizeCitationPlate(citation.plate) === target) : all
  const pending = citations.filter((citation) => {
    const status = (citation.status || '').toLowerCase()
    return status === 'pending' || status === 'pendiente'
  })
  const pendingTotal = pending.reduce((sum, citation) => sum + (Number(citation.total ?? citation.fine) || 0), 0)
  return {
    ant: null,
    citations,
    pendingCount: pending.length,
    pendingTotal,
    ownerName: personName(row.owner) || row.owner_name?.trim() || null,
    ownerId: personId(row.owner) || row.owner_id?.trim() || null,
    historyStatus: 'ok',
    citationsScope: withPlate.length > 0 ? 'plate' : scopeHint,
  }
}

export type AntSnapshot = {
  ant: EcuadorPendientes | null
  citations: EcuadorCitation[] | undefined
  pendingCount: number | null
  pendingTotal: number | null
  ownerName: string | null
  ownerId: string | null
  historyStatus: 'ok' | 'no_owner' | 'unavailable' | null
  citationsScope: 'plate' | 'owner' | null
}

function isQuito(canton: string | null): boolean {
  return /quito/i.test(canton || '')
}

export async function fetchAntSnapshot(placa: string, ownerId?: string | null): Promise<AntSnapshot> {
  const byPlate = await fetchMultasRow(`/multas/${encodeURIComponent(placa)}`, 45_000)
  if (byPlate) {
    return snapshotFromMultasRow(placa, byPlate, 'plate')
  }

  const cedula = ownerCedula(ownerId)
  if (cedula) {
    const byOwner = await fetchMultasRow(`/cedulas/${encodeURIComponent(cedula)}/multas`, 45_000)
    if (byOwner) {
      return snapshotFromMultasRow(placa, byOwner, 'owner')
    }
    const ant = await fetchPendientesSafe(placa, 'ant', 20_000)
    return {
      ant,
      citations: undefined,
      pendingCount: null,
      pendingTotal: ant?.total ?? null,
      ownerName: null,
      ownerId: null,
      historyStatus: 'unavailable',
      citationsScope: null,
    }
  }

  const ant = await fetchPendientesSafe(placa, 'ant', 20_000)
  return {
    ant,
    citations: undefined,
    pendingCount: null,
    pendingTotal: ant?.total ?? null,
    ownerName: null,
    ownerId: null,
    historyStatus: ownerId ? 'unavailable' : 'no_owner',
    citationsScope: null,
  }
}

export async function fetchEcuadorContraste(placa: string): Promise<EcuadorContrastePayload> {
  const lookup = await fetchEcuadorPlate(placa)
  const amtPromise = isQuito(lookup.canton)
    ? fetchPendientesSafe(placa, 'amt', 25_000)
    : Promise.resolve(null)
  const [sri, antSnap, amt] = await Promise.all([
    fetchPendientesSafe(placa, 'sri'),
    fetchAntSnapshot(placa, lookup.ownerIdAnt || lookup.ownerIdSri),
    amtPromise,
  ])
  if (antSnap.ownerName) lookup.ownerNameAnt = lookup.ownerNameAnt || antSnap.ownerName
  if (antSnap.ownerId) lookup.ownerIdAnt = lookup.ownerIdAnt || antSnap.ownerId
  const payload = buildContrastePayload({
    lookup,
    sri,
    ant: antSnap.ant,
    amt,
    citations: antSnap.citations,
    citationsPendingCount: antSnap.pendingCount,
    citationsPendingTotal: antSnap.pendingTotal,
  })
  applyAntHistoryFlags(payload, antSnap)
  return payload
}

function applyAntHistoryFlags(payload: EcuadorContrastePayload, snap: AntSnapshot) {
  payload.antFetchedAt = new Date().toISOString()
  payload.antHistoryStatus = snap.historyStatus
  payload.citationsScope = snap.citationsScope
  if (snap.historyStatus === 'ok') payload.antHistoryFetchedAt = payload.antFetchedAt
}

export function mergeAntIntoContrastePayload(
  prev: EcuadorContrastePayload,
  snap: AntSnapshot
): EcuadorContrastePayload {
  if (!prev.lookup) return prev
  const lookup = { ...prev.lookup }
  if (snap.ownerName) lookup.ownerNameAnt = lookup.ownerNameAnt || snap.ownerName
  if (snap.ownerId) lookup.ownerIdAnt = lookup.ownerIdAnt || snap.ownerId
  const next = buildContrastePayload({
    lookup,
    sri: prev.sri ?? null,
    ant: snap.ant,
    amt: prev.amt ?? null,
    citations: snap.citations,
    citationsPendingCount: snap.pendingCount,
    citationsPendingTotal: snap.pendingTotal,
  })
  next.emov = prev.emov
  next.juicios = prev.juicios
  next.procesos_legales = prev.procesos_legales
  applyAntHistoryFlags(next, snap)
  return next
}
