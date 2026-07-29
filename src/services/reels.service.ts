import { REELS_API_BASE } from '@/lib/automation-api'
import type {
  ReelAssignmentsResponse,
  ReelFormato,
  ReelScript,
} from '@/types/reel'

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

export type ReelActionResponse = {
  created?: boolean
  detail?: string
  script?: ReelScript
}

/** El doc solo confirma el shape de `run`; `generate` puede devolver el script directo. */
function normalizeActionResponse(body: unknown): ReelActionResponse {
  if (body && typeof body === 'object') {
    if ('script' in body || 'created' in body || 'detail' in body) {
      return body as ReelActionResponse
    }
    if ('id' in body && 'formato' in body) {
      return { created: true, script: body as ReelScript }
    }
  }
  return {}
}

export const reelsService = {
  /**
   * Por defecto solo asigna (vehículo + vendedor + variante, `fecha_programada`
   * = mañana); el cron `reels-generar-pendientes` (8am) genera el guion al día
   * siguiente. Pasa `generarAhora: true` para asignar + generar en el acto.
   */
  async runFormato(
    formato: ReelFormato,
    opts?: { fechaObjetivo?: string; generarAhora?: boolean }
  ): Promise<ReelActionResponse> {
    const body: Record<string, unknown> = {}
    if (opts?.fechaObjetivo) body.fecha_objetivo = opts.fechaObjetivo
    if (opts?.generarAhora) body.generar_ahora = true

    const res = await fetch(`${REELS_API_BASE}/run/${formato}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return normalizeActionResponse(await res.json())
  },

  async getAssignmentsByDate(
    fecha: string,
    formato?: ReelFormato
  ): Promise<ReelAssignmentsResponse> {
    const params = new URLSearchParams()
    if (fecha) params.set('fecha', fecha)
    if (formato) params.set('formato', formato)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${REELS_API_BASE}/assignments${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  async generateAssignment(assignmentId: string): Promise<ReelActionResponse> {
    const res = await fetch(`${REELS_API_BASE}/assignments/${assignmentId}/generate`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(await parseError(res))
    return normalizeActionResponse(await res.json())
  },

  async getByVendor(
    vendorId: string,
    opts?: { formato?: ReelFormato; fechaDesde?: string; fechaHasta?: string }
  ): Promise<ReelScript[]> {
    const params = new URLSearchParams()
    if (opts?.formato) params.set('formato', opts.formato)
    if (opts?.fechaDesde) params.set('fecha_desde', opts.fechaDesde)
    if (opts?.fechaHasta) params.set('fecha_hasta', opts.fechaHasta)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${REELS_API_BASE}/by-vendor/${vendorId}${qs}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(await parseError(res))
    const body = await res.json()
    if (Array.isArray(body)) return body as ReelScript[]
    if (body && Array.isArray(body.scripts)) return body.scripts as ReelScript[]
    if (body && Array.isArray(body.data)) return body.data as ReelScript[]
    return []
  },

  async markFacebookPost(scriptId: string, facebookPostId: string): Promise<ReelScript> {
    const res = await fetch(`${REELS_API_BASE}/${scriptId}/facebook-post`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facebook_post_id: facebookPostId }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    const body = await res.json()
    if (body && typeof body === 'object' && 'script' in body) {
      return body.script as ReelScript
    }
    return body as ReelScript
  },
}
