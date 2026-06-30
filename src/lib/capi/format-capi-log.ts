import type { CapiEventLogRow, CapiHealthSummary } from '@/lib/capi/types'

export function formatCapiEcDate(ts: string | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCapiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 6) return phone
  return `${digits.slice(0, 3)}…${digits.slice(-4)}`
}

export function formatCapiValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `$${Number(value).toLocaleString('es-EC', { maximumFractionDigits: 0 })}`
}

export function formatCapiErrorDetail(errorMessage: string | null | undefined): string {
  if (!errorMessage?.trim()) return '—'
  const raw = errorMessage.trim()

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const err =
      parsed.error && typeof parsed.error === 'object'
        ? (parsed.error as Record<string, unknown>)
        : parsed

    const title = typeof err.error_user_title === 'string' ? err.error_user_title.trim() : ''
    const msg = typeof err.error_user_msg === 'string' ? err.error_user_msg.trim() : ''
    const message = typeof err.message === 'string' ? err.message.trim() : ''

    if (title && msg && title !== msg) return `${title}: ${msg}`
    if (title) return title
    if (msg) return msg
    if (message) return message
  } catch {
    /* texto plano */
  }

  if (raw.length > 140) return `${raw.slice(0, 137)}…`
  return raw
}

export function computeCapiSummary(
  events: CapiEventLogRow[],
  windowHours = 24
): CapiHealthSummary {
  const sent = events.filter((e) => e.status === 'sent').length
  const failed = events.filter((e) => e.status === 'failed').length
  const total = events.length
  const error_rate_pct = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0

  return { total, sent, failed, error_rate_pct, window_hours: windowHours }
}

export function parseUpstreamCapiHealth(data: unknown): Partial<CapiHealthSummary> | null {
  if (data == null || typeof data !== 'object') return null

  const root = data as Record<string, unknown>
  const inner =
    root.summary && typeof root.summary === 'object'
      ? (root.summary as Record<string, unknown>)
      : root.data && typeof root.data === 'object'
        ? (root.data as Record<string, unknown>)
        : root

  const pickNum = (...keys: string[]) => {
    for (const key of keys) {
      const v = inner[key]
      const n =
        typeof v === 'number'
          ? v
          : typeof v === 'string' && v.trim()
            ? Number(v)
            : NaN
      if (!Number.isNaN(n)) return n
    }
    return NaN
  }

  const total = pickNum('total', 'total_events', 'count')
  const sent = pickNum('sent', 'sent_count', 'success')
  const failed = pickNum('failed', 'failed_count', 'errors')
  let error_rate_pct = pickNum('error_rate_pct', 'error_pct', 'error_percent')

  if (Number.isNaN(error_rate_pct) && typeof inner.error_rate === 'number') {
    error_rate_pct = inner.error_rate * 100
  }

  if (Number.isNaN(error_rate_pct) && !Number.isNaN(total) && total > 0 && !Number.isNaN(failed)) {
    error_rate_pct = Math.round((failed / total) * 1000) / 10
  }

  const window_hours = pickNum('window_hours', 'hours')

  if ([total, sent, failed].some((n) => Number.isNaN(n))) return null

  return {
    total,
    sent,
    failed,
    error_rate_pct: Number.isNaN(error_rate_pct) ? 0 : error_rate_pct,
    window_hours: Number.isNaN(window_hours) ? 24 : window_hours,
  }
}
