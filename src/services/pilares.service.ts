import { PILARES_API_BASE } from '@/lib/automation-api'
import {
  flattenPilarAssignments,
  isPilarSistema,
  normalizePilarScript,
  type PilarAssignmentsResponse,
  type PilarAssignmentRow,
  type PilarScript,
  type PilarSistema,
} from '@/types/pilar'

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.message === 'string') return body.message
    if (Array.isArray(body?.message)) return body.message.join(', ')
    if (typeof body?.error === 'string') return body.error
  } catch {
    /* ignore */
  }
  return `Error ${res.status}`
}

export type PilarActionResponse = {
  created?: boolean
  detail?: string
  script?: PilarScript
}

export type PilarScriptsResponse = {
  fecha: string
  responsable: string
  scripts: PilarScript[]
}

function normalizeActionResponse(body: unknown, sistema?: PilarSistema): PilarActionResponse {
  if (body && typeof body === 'object') {
    if ('script' in body || 'created' in body || 'detail' in body) {
      const o = body as PilarActionResponse & { script?: unknown }
      return {
        created: o.created,
        detail: o.detail,
        script: o.script ? normalizePilarScript(o.script, sistema) ?? undefined : undefined,
      }
    }
    const script = normalizePilarScript(body, sistema)
    if (script) return { created: true, script }
  }
  return {}
}

function parseScriptsBody(body: unknown, fallbackSistema?: PilarSistema): PilarScriptsResponse {
  const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const list: unknown[] = Array.isArray(o.scripts)
    ? o.scripts
    : Array.isArray(body)
      ? body
      : Array.isArray(o.data)
        ? (o.data as unknown[])
        : []
  return {
    fecha: typeof o.fecha === 'string' ? o.fecha : '',
    responsable: typeof o.responsable === 'string' ? o.responsable : 'Marketing',
    scripts: list
      .map((item) => normalizePilarScript(item, fallbackSistema))
      .filter((s): s is PilarScript => !!s),
  }
}

export type Pilar1ReplaceCandidate = {
  id: string
  inventory_vehicle_id?: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  presentacion?: string | null
  precio?: number | null
  mileage?: number | null
  color?: string | null
  [key: string]: unknown
}

export type Pilar1ReplaceCandidatesResponse = {
  assignment_id: string
  fecha?: string
  current_vehicle_id?: string | null
  candidates: Pilar1ReplaceCandidate[]
}

export type Pilar1ReplaceVehicleResponse = {
  assignment?: unknown
  previous_vehicle_id?: string | null
  new_vehicle_id?: string | null
  script?: PilarScript | null
  detail?: string
}

export const pilaresService = {
  async getAssignmentsByDate(fecha: string): Promise<{
    fecha: string
    responsable: string
    raw: PilarAssignmentsResponse
    assignments: PilarAssignmentRow[]
  }> {
    const params = new URLSearchParams()
    if (fecha) params.set('fecha', fecha)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${PILARES_API_BASE}/assignments${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    const raw = (await res.json()) as PilarAssignmentsResponse & { responsable?: string }
    return {
      fecha: raw.fecha || fecha,
      responsable: raw.responsable || 'Marketing',
      raw,
      assignments: flattenPilarAssignments(raw),
    }
  },

  /** Guiones del día (Marketing). Reemplaza el patrón by-vendor. */
  async getScriptsByDate(
    fecha: string,
    opts?: { sistema?: PilarSistema }
  ): Promise<PilarScriptsResponse> {
    const params = new URLSearchParams()
    if (fecha) params.set('fecha', fecha)
    if (opts?.sistema) params.set('sistema', opts.sistema)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${PILARES_API_BASE}/scripts${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    const parsed = parseScriptsBody(await res.json(), opts?.sistema)
    return { ...parsed, fecha: parsed.fecha || fecha }
  },

  async getToday(): Promise<PilarScriptsResponse> {
    const res = await fetch(`${PILARES_API_BASE}/today`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    return parseScriptsBody(await res.json())
  },

  async generateAssignment(
    sistema: PilarSistema,
    assignmentId: string
  ): Promise<PilarActionResponse> {
    const res = await fetch(
      `${PILARES_API_BASE}/${sistema}/assignments/${assignmentId}/generate`,
      { method: 'POST' }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return normalizeActionResponse(await res.json(), sistema)
  },

  async getPilar1ReplaceCandidates(
    assignmentId: string
  ): Promise<Pilar1ReplaceCandidatesResponse> {
    const res = await fetch(
      `${PILARES_API_BASE}/pilar1/assignments/${assignmentId}/replace-candidates`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error(await parseError(res))
    const body = (await res.json()) as Pilar1ReplaceCandidatesResponse
    return {
      ...body,
      candidates: Array.isArray(body.candidates) ? body.candidates : [],
    }
  },

  async replacePilar1Vehicle(
    assignmentId: string,
    opts?: { vehicleId?: string; regenerar?: boolean }
  ): Promise<Pilar1ReplaceVehicleResponse> {
    const payload: Record<string, unknown> = {}
    if (opts?.vehicleId) payload.vehicle_id = opts.vehicleId
    if (opts?.regenerar != null) payload.regenerar = opts.regenerar

    const res = await fetch(
      `${PILARES_API_BASE}/pilar1/assignments/${assignmentId}/replace-vehicle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    const body = (await res.json()) as Pilar1ReplaceVehicleResponse & { script?: unknown }
    return {
      ...body,
      script: body.script ? normalizePilarScript(body.script, 'pilar1') : null,
    }
  },
}

export function parseSistemaParam(x: string | null | undefined): PilarSistema | null {
  if (!x) return null
  return isPilarSistema(x) ? x : null
}
