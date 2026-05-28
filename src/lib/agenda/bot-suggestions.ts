/** Inicio de mayo 2026 (local): abril y meses anteriores no van a Pendientes ni Sugerencias IA */
export const AGENDA_VISIBLE_FROM = new Date(2026, 4, 1, 0, 0, 0, 0)

export type BotSuggestionLeadLike = {
  time_reference?: string | null
  day_detected?: string | null
  hour_detected?: string | null
  created_at?: string | null
}

/** Fecha/hora de referencia para sugerencias IA (alineado con BotSuggestionCard / useAgenda). */
export function getSuggestionReferenceInstant(lead: BotSuggestionLeadLike): Date | null {
  if (lead.time_reference) {
    const d = new Date(lead.time_reference)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (lead.day_detected) {
    const raw = lead.day_detected.toString().trim()
    const parts = raw.split(/[-/]/)
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      const d = parseInt(parts[2], 10)
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const date = new Date(y, m - 1, d, 12, 0, 0, 0)
        return Number.isNaN(date.getTime()) ? null : date
      }
    }
  }
  if (lead.hour_detected) {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0)
  }
  if (lead.created_at) {
    const d = new Date(lead.created_at)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function isBotSuggestionVisible(lead: BotSuggestionLeadLike): boolean {
  const ref = getSuggestionReferenceInstant(lead)
  if (ref && !Number.isNaN(ref.getTime()) && ref < AGENDA_VISIBLE_FROM) return false
  if (!ref && lead.created_at) {
    const created = new Date(lead.created_at)
    if (!Number.isNaN(created.getTime()) && created < AGENDA_VISIBLE_FROM) return false
  }
  return true
}

export function isAppointmentPendingActive(
  appt: Pick<{ status?: string | null; start_time: string }, 'status' | 'start_time'> & {
    is_completed?: boolean | null
  }
): boolean {
  if (appt.is_completed === true) return false

  const start = new Date(appt.start_time)
  if (!Number.isNaN(start.getTime()) && start < AGENDA_VISIBLE_FROM) return false

  const activeStatuses = ['pendiente', 'confirmada', 'reprogramada']
  return activeStatuses.includes(appt.status || 'pendiente')
}
