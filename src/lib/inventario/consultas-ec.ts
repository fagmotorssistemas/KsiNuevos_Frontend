import type {
  EcuadorContrastePayload,
  EcuadorJuiciosConsulta,
  ConsultasJuicio,
} from '@/lib/inventario/ecuadorContraste'

export type { ConsultasJuicio, EcuadorJuiciosConsulta }

const DEFAULT_BASE = 'https://consultas.ec'

export function isConsultasEcConfigured(): boolean {
  return Boolean(getConsultasEcKey())
}

function getConsultasEcKey(): string | null {
  return (
    process.env.CONSULTAS_EC_API_KEY?.trim() ||
    process.env.CONSULTAS_EC_TOKEN?.trim() ||
    process.env['X-Credits-Token']?.trim() ||
    null
  )
}

function getBaseUrl(): string {
  return (process.env.CONSULTAS_EC_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, '')
}

export function normalizeCedulaOrRuc(value: string | null | undefined): string | null {
  const digits = (value || '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 13) return digits
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string | null {
  if (!obj) return null
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function listFromBody(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  const rec = asRecord(body)
  if (!rec) return []
  for (const key of ['procesos', 'juicios', 'causas', 'data', 'results', 'items', 'personas']) {
    const value = rec[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function mapJuicio(row: unknown): ConsultasJuicio | null {
  const rec = asRecord(row)
  if (!rec) return null
  const causa = pickString(rec, ['causa', 'numeroCausa', 'numero_causa', 'nroCausa', 'n_causa', 'idJuicio', 'id'])
  const accion = pickString(rec, ['accion', 'tipoAccion', 'tipo_accion', 'tipo', 'materia', 'infraccion'])
  const fecha = pickString(rec, ['fecha', 'fechaIngreso', 'fecha_ingreso', 'anio', 'year'])
  const rol = pickString(rec, ['rol', 'calidad', 'parte', 'actorDemandado'])
  const estado = pickString(rec, ['estado', 'estadoProceso', 'estado_proceso', 'situacion'])
  if (!causa && !accion && !estado) return null
  return { causa, accion, fecha, rol, estado }
}

function parseJuiciosBody(body: unknown): { titular: string | null; procesos: ConsultasJuicio[] } {
  const rec = asRecord(body)
  const titular = pickString(rec, ['nombre', 'titular', 'nombres', 'razonSocial', 'razon_social'])
  const procesos = listFromBody(body)
    .map(mapJuicio)
    .filter((row): row is ConsultasJuicio => Boolean(row))
  return { titular, procesos }
}

function parseCedulaFromNameSearch(body: unknown): { cedula: string | null; ambiguous: boolean } {
  const rec = asRecord(body)
  const direct = normalizeCedulaOrRuc(pickString(rec, ['cedula', 'identificacion', 'id', 'ruc']))
  if (direct) return { cedula: direct, ambiguous: false }
  const rows = listFromBody(body)
  const cedulas = rows
    .map((row) => normalizeCedulaOrRuc(pickString(asRecord(row), ['cedula', 'identificacion', 'id', 'ruc'])))
    .filter((value): value is string => Boolean(value))
  const unique = [...new Set(cedulas)]
  if (unique.length === 1) return { cedula: unique[0], ambiguous: false }
  if (unique.length > 1) return { cedula: null, ambiguous: true }
  return { cedula: null, ambiguous: false }
}

export class ConsultasEcError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = 'ConsultasEcError'
  }
}

export type ConsultasPathResult = {
  data: unknown
  error: string | null
  httpStatus: number
}

export async function fetchConsultasPath(path: string, timeoutMs = 45_000): Promise<ConsultasPathResult> {
  try {
    const data = await consultasGetJson(path, timeoutMs)
    return { data, error: null, httpStatus: data == null ? 404 : 200 }
  } catch (error) {
    if (error instanceof ConsultasEcError) {
      return { data: null, error: error.message, httpStatus: error.httpStatus }
    }
    return {
      data: null,
      error: error instanceof Error ? error.message : 'No se pudo consultar Consultas.ec',
      httpStatus: 502,
    }
  }
}

export function extractIdentityHints(body: unknown): {
  cedula: string | null
  ruc: string | null
  nombre: string | null
  placa: string | null
} {
  let cedula: string | null = null
  let ruc: string | null = null
  let nombre: string | null = null
  let placa: string | null = null

  function walk(value: unknown, depth: number) {
    if (depth > 6 || value == null) return
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 20)) walk(item, depth + 1)
      return
    }
    const rec = asRecord(value)
    if (!rec) return
    if (!cedula) cedula = normalizeCedulaOrRuc(pickString(rec, ['cedula', 'identificacion', 'id_number', 'ci']))
    if (cedula && cedula.length === 13) {
      ruc = ruc || cedula
      cedula = null
    }
    if (!ruc) {
      const maybeRuc = (pickString(rec, ['ruc', 'numeroRuc', 'numero_ruc']) || '').replace(/\D/g, '')
      if (maybeRuc.length === 13) ruc = maybeRuc
    }
    if (!nombre) {
      nombre = pickString(rec, [
        'nombre',
        'nombreCompleto',
        'nombre_completo',
        'nombres',
        'titular',
        'razonSocial',
        'razon_social',
        'propietario',
        'owner',
        'full_name',
        'fullName',
      ])
    }
    if (!placa) {
      const raw = pickString(rec, ['placa', 'plate', 'placaVehiculo'])
      if (raw) placa = raw.replace(/[\s-]/g, '').toUpperCase()
    }
    for (const nested of Object.values(rec)) {
      if (typeof nested === 'object' && nested) walk(nested, depth + 1)
    }
  }

  walk(body, 0)
  return { cedula, ruc, nombre, placa }
}

async function consultasGetJson(path: string, timeoutMs = 25_000): Promise<unknown> {
  const key = getConsultasEcKey()
  if (!key) {
    throw new ConsultasEcError('Consultas.ec no está configurada', 503)
  }
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    headers: { 'X-Credits-Token': key },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })
  if (res.status === 404) return null
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    throw new ConsultasEcError('Respuesta inválida de Consultas.ec', 502)
  }
  if (res.status === 401) throw new ConsultasEcError('API key de Consultas.ec inválida', 401)
  if (res.status === 402) throw new ConsultasEcError('Sin créditos en Consultas.ec', 402)
  if (res.status === 429) throw new ConsultasEcError('Límite de Consultas.ec (30 req/min)', 429)
  if (!res.ok) {
    const rec = asRecord(body)
    const message = pickString(rec, ['error', 'message', 'detalle']) || `Error Consultas.ec (${res.status})`
    throw new ConsultasEcError(message, res.status)
  }
  return body
}

export async function resolveCedulaByOwnerName(name: string): Promise<{ cedula: string | null; error: string | null }> {
  const query = name.trim().replace(/\s+/g, ' ')
  if (!query) return { cedula: null, error: 'Sin nombre para buscar cédula' }
  try {
    const body = await consultasGetJson(`/fetchdata?name=${encodeURIComponent(query)}`)
    const parsed = parseCedulaFromNameSearch(body)
    if (parsed.ambiguous) {
      return { cedula: null, error: 'Varias cédulas coinciden con el nombre del propietario' }
    }
    if (!parsed.cedula) return { cedula: null, error: 'No se encontró cédula para el propietario' }
    return { cedula: parsed.cedula, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo resolver la cédula'
    return { cedula: null, error: message }
  }
}

export async function fetchJuiciosRaw(cedula: string): Promise<{
  cedula: string | null
  error: string | null
  titular: string | null
  body: unknown
  procesos: unknown[]
}> {
  const id = normalizeCedulaOrRuc(cedula)
  if (!id) {
    return { cedula: null, error: 'Cédula o RUC inválido', titular: null, body: null, procesos: [] }
  }
  const result = await fetchConsultasPath(`/juicios/${encodeURIComponent(id)}`)
  if (result.error) {
    return { cedula: id, error: result.error, titular: null, body: null, procesos: [] }
  }
  const parsed = parseJuiciosBody(result.data)
  return {
    cedula: id,
    error: null,
    titular: parsed.titular,
    body: result.data,
    procesos: listFromBody(result.data),
  }
}

export async function fetchJuiciosByCedula(cedula: string): Promise<Omit<EcuadorJuiciosConsulta, 'resolvedFrom'>> {
  const id = normalizeCedulaOrRuc(cedula)
  if (!id) {
    return {
      cedula: null,
      titular: null,
      queriedAt: new Date().toISOString(),
      procesos: [],
      error: 'Cédula o RUC inválido',
    }
  }
  try {
    const body = await consultasGetJson(`/juicios/${encodeURIComponent(id)}`)
    if (body == null) {
      return {
        cedula: id,
        titular: null,
        queriedAt: new Date().toISOString(),
        procesos: [],
        error: null,
      }
    }
    const parsed = parseJuiciosBody(body)
    return {
      cedula: id,
      titular: parsed.titular,
      queriedAt: new Date().toISOString(),
      procesos: parsed.procesos,
      error: null,
    }
  } catch (error) {
    return {
      cedula: id,
      titular: null,
      queriedAt: new Date().toISOString(),
      procesos: [],
      error: error instanceof Error ? error.message : 'No se pudo consultar Función Judicial',
    }
  }
}

export function juiciosToContrastCell(juicios: EcuadorJuiciosConsulta | null): {
  text: string
  vigente: boolean | null
} {
  if (!juicios) return { text: 'Sin consultar Función Judicial', vigente: null }
  if (juicios.error) return { text: juicios.error, vigente: null }
  if (juicios.procesos.length === 0) {
    return { text: 'Sin procesos en Función Judicial', vigente: true }
  }
  return {
    text: `${juicios.procesos.length} proceso${juicios.procesos.length === 1 ? '' : 's'} en Función Judicial`,
    vigente: false,
  }
}

export async function loadJuiciosForOwner(input: {
  cedula?: string | null
  ownerName?: string | null
}): Promise<EcuadorJuiciosConsulta | null> {
  if (!isConsultasEcConfigured()) {
    return {
      cedula: normalizeCedulaOrRuc(input.cedula),
      titular: input.ownerName?.trim() || null,
      queriedAt: new Date().toISOString(),
      resolvedFrom: null,
      procesos: [],
      error: 'Consultas.ec no está configurada',
    }
  }

  const direct = normalizeCedulaOrRuc(input.cedula)
  if (direct) {
    return { ...(await fetchJuiciosByCedula(direct)), resolvedFrom: 'cedula' }
  }

  const name = input.ownerName?.trim() || null
  if (!name) {
    return {
      cedula: null,
      titular: null,
      queriedAt: new Date().toISOString(),
      resolvedFrom: null,
      procesos: [],
      error: 'Sin cédula del propietario para consultar Función Judicial',
    }
  }

  const resolved = await resolveCedulaByOwnerName(name)
  if (!resolved.cedula) {
    return {
      cedula: null,
      titular: name,
      queriedAt: new Date().toISOString(),
      resolvedFrom: 'nombre',
      procesos: [],
      error: resolved.error,
    }
  }
  return { ...(await fetchJuiciosByCedula(resolved.cedula)), resolvedFrom: 'nombre' }
}

export function attachJuiciosToContraste(
  payload: EcuadorContrastePayload,
  juicios: EcuadorJuiciosConsulta | null
): EcuadorContrastePayload {
  return {
    ...payload,
    juicios,
    procesos_legales: juiciosToContrastCell(juicios),
  }
}
