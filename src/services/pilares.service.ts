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

export const pilaresService = {
  async getAssignmentsByDate(fecha: string): Promise<{
    fecha: string
    raw: PilarAssignmentsResponse
    assignments: PilarAssignmentRow[]
  }> {
    const params = new URLSearchParams()
    if (fecha) params.set('fecha', fecha)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${PILARES_API_BASE}/assignments${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    const raw = (await res.json()) as PilarAssignmentsResponse
    return {
      fecha: raw.fecha || fecha,
      raw,
      assignments: flattenPilarAssignments(raw),
    }
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

  async getByVendor(
    vendorId: string,
    opts?: { sistema?: PilarSistema; fechaDesde?: string; fechaHasta?: string }
  ): Promise<PilarScript[]> {
    const params = new URLSearchParams()
    if (opts?.sistema) params.set('sistema', opts.sistema)
    if (opts?.fechaDesde) params.set('fecha_desde', opts.fechaDesde)
    if (opts?.fechaHasta) params.set('fecha_hasta', opts.fechaHasta)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${PILARES_API_BASE}/by-vendor/${vendorId}${qs}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(await parseError(res))
    const body = await res.json()
    const list: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.scripts)
        ? body.scripts
        : Array.isArray(body?.data)
          ? body.data
          : []
    return list
      .map((item) => normalizePilarScript(item, opts?.sistema))
      .filter((s): s is PilarScript => !!s)
  },

  async markFacebookPost(
    sistema: PilarSistema,
    scriptId: string,
    facebookPostId: string
  ): Promise<PilarScript> {
    const res = await fetch(`${PILARES_API_BASE}/${sistema}/${scriptId}/facebook-post`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facebook_post_id: facebookPostId }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    const body = await res.json()
    const raw = body && typeof body === 'object' && 'script' in body ? body.script : body
    const script = normalizePilarScript(raw, sistema)
    if (!script) throw new Error('Respuesta de facebook-post inválida')
    return script
  },
}

export function parseSistemaParam(x: string | null | undefined): PilarSistema | null {
  if (!x) return null
  return isPilarSistema(x) ? x : null
}
