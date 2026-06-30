import { NextResponse } from 'next/server'

import { computeCapiSummary, parseUpstreamCapiHealth } from '@/lib/capi/format-capi-log'
import { capiDb } from '@/lib/capi/db'
import type { CapiEventLogRow, CapiHealthPayload } from '@/lib/capi/types'
import { proxyAutomationInternal } from '@/lib/automation-api-proxy'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

const WINDOW_HOURS = 24
const EVENTS_LIMIT = 500

const EVENT_SELECT =
  'id, event_id, phone, event_name, ctwa_clid, value, status, meta_response, error_message, created_at, sent_at'

function mapEventRow(row: Record<string, unknown>): CapiEventLogRow {
  return {
    id: String(row.id ?? ''),
    event_id: String(row.event_id ?? ''),
    phone: String(row.phone ?? ''),
    event_name: String(row.event_name ?? ''),
    ctwa_clid: (row.ctwa_clid as string | null) ?? null,
    value: row.value != null ? Number(row.value) : null,
    status: String(row.status ?? ''),
    meta_response: row.meta_response ?? null,
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    sent_at: (row.sent_at as string | null) ?? null,
  }
}

async function fetchEventsFromSupabase(): Promise<CapiEventLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data, error } = await capiDb(supabase)
    .from('capi_event_sync_log')
    .select(EVENT_SELECT)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(EVENTS_LIMIT)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => mapEventRow(row))
}

async function fetchUpstreamHealth(): Promise<ReturnType<typeof parseUpstreamCapiHealth>> {
  const res = await proxyAutomationInternal('/capi/health', { method: 'GET' })
  if (!res.ok) return null
  try {
    const json = (await res.json()) as unknown
    return parseUpstreamCapiHealth(json)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const [events, upstreamSummary] = await Promise.all([
      fetchEventsFromSupabase(),
      fetchUpstreamHealth(),
    ])

    const computed = computeCapiSummary(events, WINDOW_HOURS)
    const summary =
      upstreamSummary &&
      upstreamSummary.total != null &&
      upstreamSummary.sent != null &&
      upstreamSummary.failed != null
        ? {
            total: upstreamSummary.total,
            sent: upstreamSummary.sent,
            failed: upstreamSummary.failed,
            error_rate_pct:
              upstreamSummary.error_rate_pct ?? computed.error_rate_pct,
            window_hours: upstreamSummary.window_hours ?? WINDOW_HOURS,
          }
        : computed

    const payload: CapiHealthPayload = {
      ok: true,
      summary,
      events,
      source: {
        health: upstreamSummary ? 'upstream' : 'computed',
        events: 'supabase',
      },
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'No se pudo cargar CAPI Meta'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
