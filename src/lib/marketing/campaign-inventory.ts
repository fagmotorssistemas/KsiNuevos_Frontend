import type { SupabaseClient } from '@supabase/supabase-js'
import type { CampaignSegment } from '@/types/marketing-campaigns'
import { inferCampaignSegment } from '@/lib/marketing/campaign-segments'

const INVENTORY_BATCH = 800
const MAX_INVENTORY_ROWS = 15000

export type CampaignInventoryRow = {
  id: string
  brand: string
  model: string
  year: number
  type_body: string | null
  type: string | null
  status: string | null
  location: string | null
  img_main_url: string | null
  plate: string | null
  price: number | null
  internal_fixed_price: number | null
  marketing_videos_count: number | null
}

/** Inventario operativo desde inventoryoracle (mismo criterio que inventariado marketing). */
export async function fetchCampaignInventory(
  supabase: SupabaseClient
): Promise<CampaignInventoryRow[]> {
  const rows: CampaignInventoryRow[] = []
  let offset = 0

  for (;;) {
    const { data, error } = await supabase
      .from('inventoryoracle')
      .select(
        'id, brand, model, year, type_body, type, status, location, img_main_url, plate, price, internal_fixed_price, marketing_videos_count'
      )
      .neq('status', 'vendido')
      .order('internal_fixed_price', { ascending: false, nullsFirst: false })
      .order('brand', { ascending: true })
      .range(offset, offset + INVENTORY_BATCH - 1)

    if (error) throw error

    const chunk = (data ?? []) as CampaignInventoryRow[]
    rows.push(...chunk)

    if (chunk.length < INVENTORY_BATCH) break
    offset += INVENTORY_BATCH
    if (rows.length >= MAX_INVENTORY_ROWS) break
  }

  return rows
}

export function resolveCampaignDisplayPrice(row: {
  price?: number | null
  internal_fixed_price?: number | null
  price_snapshot?: number | null
}): number | null {
  if (row.price_snapshot != null) return row.price_snapshot
  if (row.internal_fixed_price != null) return row.internal_fixed_price
  if (row.price != null && row.price > 0) return row.price
  return null
}

export function inventorySegment(row: CampaignInventoryRow): CampaignSegment | null {
  return inferCampaignSegment({
    type_body: row.type_body,
    type: row.type,
    model: row.model,
    brand: row.brand,
  })
}

export function matchesSegmentFilter(
  row: { type_body?: string | null; type?: string | null; model?: string | null; brand?: string | null },
  segment: CampaignSegment | null
): boolean {
  if (!segment) return true
  return inferCampaignSegment(row) === segment
}
