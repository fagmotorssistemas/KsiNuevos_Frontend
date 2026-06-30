export type CapiEventStatus = 'sent' | 'failed' | (string & {})

export type CapiEventLogRow = {
  id: string
  event_id: string
  phone: string
  event_name: string
  ctwa_clid: string | null
  value: number | null
  status: CapiEventStatus
  meta_response: unknown
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export type CapiHealthSummary = {
  total: number
  sent: number
  failed: number
  error_rate_pct: number
  window_hours: number
}

export type CapiHealthPayload = {
  ok: true
  summary: CapiHealthSummary
  events: CapiEventLogRow[]
  source: {
    health: 'upstream' | 'computed'
    events: 'supabase'
  }
}
