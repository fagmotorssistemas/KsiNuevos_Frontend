/** Tipos del backend interno de métricas (Meta Ads / pausas). */

export type MetaActiveAd = {
  ad_id: string
  ad_name?: string | null
  /** Estado en Meta (API en vivo). */
  meta_status?: string | null
  /** effective_status — mismo criterio que Ads Manager. */
  effective_status?: string | null
}

export type MetaActiveCampaignGroup = {
  campaign_name?: string | null
  campaign_id?: string | null
  active_ads_count?: number
  active_ads?: MetaActiveAd[]
}

export type SoldVehicleActiveAdsAlert = {
  inventory_id: string
  vehicle_label?: string | null
  total_active_ads?: number
  campaigns?: MetaActiveCampaignGroup[]
}

export type RecentAdPauseItem = {
  ad_id: string
  ad_name?: string | null
  campaign_name?: string | null
  meta_confirmed?: boolean
  meta_response?: unknown
  paused_at?: string | null
  paused_by?: string | null
  inventory_id?: string
}

export type RecentAdPauseGroup = {
  inventory_id: string
  vehicle_label?: string | null
  paused_at?: string | null
  paused_by?: string | null
  all_confirmed?: boolean
  ads?: RecentAdPauseItem[]
  pauses?: RecentAdPauseItem[]
  items?: RecentAdPauseItem[]
}

export type MetricsAlertsPayload = {
  sold_vehicles_active_ads?: SoldVehicleActiveAdsAlert[]
  recent_ad_pauses?: RecentAdPauseGroup[]
  sold_vehicles_active_ads_checked_at?: string | null
  [key: string]: unknown
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function adIsLiveActive(ad: MetaActiveAd): boolean {
  const eff = String(ad.effective_status ?? ad.meta_status ?? '').toUpperCase()
  return eff === 'ACTIVE'
}

/** Solo anuncios que el backend marcó ACTIVE/effective_status ACTIVE (defensa en el front). */
function sanitizeSoldActiveAlerts(alerts: SoldVehicleActiveAdsAlert[]): SoldVehicleActiveAdsAlert[] {
  const out: SoldVehicleActiveAdsAlert[] = []

  for (const alert of alerts) {
    const campaigns = (alert.campaigns ?? [])
      .map((c) => {
        const active_ads = (c.active_ads ?? []).filter(adIsLiveActive)
        return {
          ...c,
          active_ads,
          active_ads_count: active_ads.length,
        }
      })
      .filter((c) => (c.active_ads?.length ?? 0) > 0)

    const total = campaigns.reduce((n, c) => n + (c.active_ads?.length ?? 0), 0)
    if (total === 0) continue

    out.push({
      ...alert,
      campaigns,
      total_active_ads: total,
    })
  }

  return out
}

export function normalizeMetricsAlertsPayload(raw: unknown): {
  soldActive: SoldVehicleActiveAdsAlert[]
  recentPauses: RecentAdPauseGroup[]
  checkedAt: string | null
} {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const data =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root

  const soldRaw = asArray<SoldVehicleActiveAdsAlert>(
    data.sold_vehicles_active_ads ?? data.sold_active_alerts
  )
  const soldActive = sanitizeSoldActiveAlerts(soldRaw)

  const recentRaw = asArray<RecentAdPauseGroup | RecentAdPauseItem>(data.recent_ad_pauses)
  const recentPauses = groupRecentPauses(recentRaw)

  const checkedAt =
    typeof data.sold_vehicles_active_ads_checked_at === 'string'
      ? data.sold_vehicles_active_ads_checked_at
      : null

  return { soldActive, recentPauses, checkedAt }
}

function isPauseGroup(row: RecentAdPauseGroup | RecentAdPauseItem): row is RecentAdPauseGroup {
  return (
    'inventory_id' in row &&
    ('all_confirmed' in row ||
      'ads' in row ||
      'pauses' in row ||
      'items' in row ||
      !('ad_id' in row))
  )
}

/** Agrupa filas planas de meta_ad_pause_log o acepta grupos ya armados por el API. */
export function groupRecentPauses(raw: Array<RecentAdPauseGroup | RecentAdPauseItem>): RecentAdPauseGroup[] {
  if (raw.length === 0) return []

  if (raw.every(isPauseGroup)) {
    return raw.map((g) => normalizePauseGroup(g as RecentAdPauseGroup))
  }

  const map = new Map<string, RecentAdPauseGroup>()

  for (const row of raw) {
    const item = row as RecentAdPauseItem & { inventory_id?: string; vehicle_label?: string }
    const inv = item.inventory_id
    if (!inv) continue
    const bucketKey = `${inv}::${item.paused_at ?? 'unknown'}`
    const existing = map.get(bucketKey) ?? {
      inventory_id: inv,
      vehicle_label: (row as RecentAdPauseGroup).vehicle_label,
      paused_at: item.paused_at ?? null,
      paused_by: item.paused_by ?? null,
      ads: [],
    }
    if ((row as RecentAdPauseGroup).vehicle_label) {
      existing.vehicle_label = (row as RecentAdPauseGroup).vehicle_label
    }
    existing.ads = [...(existing.ads ?? []), item]
    map.set(bucketKey, existing)
  }

  return [...map.values()].map(normalizePauseGroup)
}

export function normalizePauseGroup(g: RecentAdPauseGroup): RecentAdPauseGroup {
  const ads = g.ads ?? g.pauses ?? g.items ?? []
  const allConfirmed =
    g.all_confirmed ??
    (ads.length > 0 ? ads.every((a) => a.meta_confirmed === true) : false)
  return { ...g, ads, all_confirmed: allConfirmed }
}

export function pauseItems(group: RecentAdPauseGroup): RecentAdPauseItem[] {
  return group.ads ?? group.pauses ?? group.items ?? []
}

export function formatMetaResponse(res: unknown): string {
  if (res == null) return ''
  if (typeof res === 'string') return res
  try {
    return JSON.stringify(res, null, 2)
  } catch {
    return String(res)
  }
}

export function apiErrorMessage(j: unknown, fallback: string): string {
  if (!j || typeof j !== 'object') return fallback
  const o = j as Record<string, unknown>
  const pick = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (v && typeof v === 'object') {
      try {
        return JSON.stringify(v)
      } catch {
        return String(v)
      }
    }
    return v != null ? String(v) : null
  }
  return pick(o.message) ?? pick(o.error) ?? fallback
}

export async function pauseVehicleAds(inventoryId: string): Promise<unknown> {
  const res = await fetch(`/api/marketing/metrics/ads/pause-vehicle/${encodeURIComponent(inventoryId)}`, {
    method: 'POST',
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(apiErrorMessage(j, 'No se pudieron pausar los anuncios'))
  }
  return (j as { data?: unknown }).data ?? j
}

export async function refreshMetricsCampaigns(): Promise<void> {
  const res = await fetch('/api/marketing/metrics/campaigns-refresh', { method: 'POST' })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(apiErrorMessage(j, 'No se pudo refrescar campañas'))
  }
}
