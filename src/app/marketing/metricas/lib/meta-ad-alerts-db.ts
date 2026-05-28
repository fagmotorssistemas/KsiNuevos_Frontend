import type { SupabaseClient } from '@supabase/supabase-js'

import { metricsDb } from '@/app/marketing/metricas/lib/db'
import {
  groupRecentPauses,
  normalizePauseGroup,
  type RecentAdPauseGroup,
  type RecentAdPauseItem,
} from '@/app/marketing/metricas/lib/meta-ad-alerts'

const PAUSE_LOG_HOURS = 72

const PAUSE_LOG_SELECT =
  'id, inventory_id, campaign_id, campaign_name, ad_id, ad_name, paused_at, paused_by, meta_confirmed, meta_response'

function mapPauseLogRow(row: Record<string, unknown>): RecentAdPauseItem {
  return {
    ad_id: String(row.ad_id ?? ''),
    ad_name: (row.ad_name as string | null) ?? null,
    campaign_name: (row.campaign_name as string | null) ?? null,
    meta_confirmed: row.meta_confirmed === true,
    meta_response: row.meta_response ?? null,
    paused_at: (row.paused_at as string | null) ?? null,
    paused_by: (row.paused_by as string | null) ?? null,
    inventory_id: (row.inventory_id as string | undefined) ?? undefined,
  }
}

async function enrichVehicleLabels(
  db: ReturnType<typeof metricsDb>,
  groups: RecentAdPauseGroup[]
): Promise<RecentAdPauseGroup[]> {
  const ids = [...new Set(groups.map((g) => g.inventory_id).filter(Boolean))]
  if (ids.length === 0) return groups

  const { data } = await db.from('inventoryoracle').select('id, brand, model, year').in('id', ids)
  const labels = new Map<string, string>()
  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? '')
    const label = [
      (row as { brand?: string }).brand,
      (row as { model?: string }).model,
      (row as { year?: number }).year,
    ]
      .filter((x) => x != null && String(x).trim() !== '')
      .join(' ')
      .trim()
    if (id && label) labels.set(id, label)
  }

  return groups.map((g) => ({
    ...g,
    vehicle_label: g.vehicle_label ?? labels.get(g.inventory_id) ?? null,
  }))
}

/** Pausas registradas por el cron / backend en `meta_ad_pause_log` (solo lectura). */
export async function fetchRecentPausesFromSupabase(
  supabase: SupabaseClient
): Promise<RecentAdPauseGroup[]> {
  const db = metricsDb(supabase)
  const since = new Date(Date.now() - PAUSE_LOG_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await db
    .from('meta_ad_pause_log')
    .select(PAUSE_LOG_SELECT)
    .gte('paused_at', since)
    .order('paused_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  const flat = (data ?? []).map((r: Record<string, unknown>) => mapPauseLogRow(r))
  const grouped = groupRecentPauses(flat).map((g) => normalizePauseGroup(g))
  return enrichVehicleLabels(db, grouped)
}

export async function fetchMetricsAlerts(supabase: SupabaseClient) {
  const recentPauses = await fetchRecentPausesFromSupabase(supabase)
  return { recent_ad_pauses: recentPauses }
}

export async function fetchMetaAdAlertsBadgeCount(supabase: SupabaseClient): Promise<number> {
  const pauses = await fetchRecentPausesFromSupabase(supabase)
  return pauses.filter((g) => g.all_confirmed !== true).length
}
