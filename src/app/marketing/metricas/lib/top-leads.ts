import type { SupabaseClient } from '@supabase/supabase-js'

import { inferCategory, type VehicleCategory } from './inventory-metrics'
import { metricsDb } from './db'

type InventoryOracleLite = {
  id: string
  brand: string | null
  model: string | null
  year: number | null
  status: string | null
  created_at?: string | null
}

export type TopVehicleRow = {
  inventory_id: string
  vehicle_label: string
  leads: number
  category: VehicleCategory | '—'
  status: string
}

export async function fetchTopVehiclesByLeads(
  supabase: SupabaseClient,
  days: number,
  limit = 5
): Promise<TopVehicleRow[]> {
  const db = metricsDb(supabase)
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const { data, error } = await db
    .from('interested_cars')
    .select('vehicle_uid, created_at')
    .not('vehicle_uid', 'is', null)
    .gte('created_at', since.toISOString())

  if (error) throw error

  const counts = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  for (const row of (data ?? []) as Array<{ vehicle_uid?: string | null; created_at?: string | null }>) {
    const id = row.vehicle_uid
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
    if (row.created_at && !firstSeen.has(id)) {
      firstSeen.set(id, new Date(row.created_at).getTime())
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const ids = sorted.map(([id]) => id)
  if (ids.length === 0) return []

  const { data: inv, error: invErr } = await db
    .from('inventoryoracle')
    .select('id, brand, model, year, status, created_at')
    .in('id', ids)

  if (invErr) throw invErr

  const rows = (inv ?? []) as InventoryOracleLite[]
  const invMap = new Map<string, InventoryOracleLite>(rows.map((r) => [r.id, r]))
  const now = Date.now()
  const rangeFlag: 7 | 30 = days >= 30 ? 30 : 7

  return sorted.map(([id, leads]) => {
    const v = invMap.get(id)
    const label = v ? [v.brand, v.model, v.year].filter(Boolean).join(' ') : id
    const created = v?.created_at ? new Date(v.created_at).getTime() : now
    const daysListed = Math.max(0, Math.floor((now - created) / 86400000))
    const cat: VehicleCategory | '—' = v ? inferCategory(leads, daysListed, rangeFlag) : '—'
    return {
      inventory_id: id,
      vehicle_label: label,
      leads,
      category: cat,
      status: String(v?.status ?? '—'),
    }
  })
}
