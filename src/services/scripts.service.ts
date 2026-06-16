import type { ScriptRow } from '@/components/marketing/ScriptCard'
import { SCRIPTS_API_BASE } from '@/lib/automation-api'
import type {
  AssignmentsByDateResponse,
  GeneratedScriptApi,
  MonthOverviewResponse,
  ScriptAssignmentRow,
} from '@/types/script-assignment'

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

export const scriptsService = {
  async getAssignmentsByDate(fecha?: string): Promise<AssignmentsByDateResponse> {
    const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
    const res = await fetch(`${SCRIPTS_API_BASE}/assignments${qs}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  async getMonthOverview(mes: string): Promise<MonthOverviewResponse> {
    const res = await fetch(
      `${SCRIPTS_API_BASE}/month-overview?mes=${encodeURIComponent(mes)}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  async submitKeywords(
    assignmentId: string,
    palabrasClave: string[],
    submittedBy?: string
  ): Promise<{
    assignment_id: string
    status: string
    palabras_clave: string[]
    guion_tipo: string | null
  }> {
    const res = await fetch(
      `${SCRIPTS_API_BASE}/assignments/${assignmentId}/keywords`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palabras_clave: palabrasClave,
          ...(submittedBy ? { submitted_by: submittedBy } : {}),
        }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  async generateForAssignment(assignmentId: string): Promise<{
    assignment_id: string
    scripts: GeneratedScriptApi[]
  }> {
    const res = await fetch(
      `${SCRIPTS_API_BASE}/assignments/${assignmentId}/generate`,
      { method: 'POST' }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  async fetchScriptsByAssignmentIds(
    assignmentIds: string[]
  ): Promise<(ScriptRow & { assignment_id?: string | null })[]> {
    if (assignmentIds.length === 0) return []
    const qs = `?assignment_ids=${encodeURIComponent(assignmentIds.join(','))}`
    const res = await fetch(`${SCRIPTS_API_BASE}/guiones${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await parseError(res))
    const body = (await res.json()) as { scripts?: (ScriptRow & { assignment_id?: string | null })[] }
    return body.scripts ?? []
  },
}

export function patchAssignmentRow(
  rows: ScriptAssignmentRow[],
  assignmentId: string,
  patch: Partial<ScriptAssignmentRow>
): ScriptAssignmentRow[] {
  return rows.map((r) =>
    r.assignment_id === assignmentId ? { ...r, ...patch } : r
  )
}
