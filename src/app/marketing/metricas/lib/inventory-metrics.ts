import type { SupabaseClient } from '@supabase/supabase-js'

import { ecuadorCalendarParts, toYmd } from './daily-metrics-report'
import { metricsDb } from './db'

export type VehicleCategory = 'URGENTE' | 'RESCATE' | 'ROTACION' | 'ESTRELLA'

const CATEGORY_STYLES: Record<VehicleCategory, { label: string; bg: string; text: string }> = {
  URGENTE: { label: 'URGENTE', bg: 'bg-red-50', text: 'text-red-700 ring-red-200' },
  RESCATE: { label: 'RESCATE', bg: 'bg-orange-50', text: 'text-orange-700 ring-orange-200' },
  ROTACION: { label: 'ROTACION', bg: 'bg-yellow-50', text: 'text-yellow-800 ring-yellow-200' },
  ESTRELLA: { label: 'ESTRELLA', bg: 'bg-emerald-50', text: 'text-emerald-700 ring-emerald-200' },
}

export function categoryBadge(category: VehicleCategory) {
  return CATEGORY_STYLES[category]
}

/** Heurística local si el backend aún no expone categoría por auto. */
export function inferCategory(leadsWindow: number, daysListedApprox: number, rangeDays: 7 | 30): VehicleCategory {
  const starThreshold = rangeDays >= 30 ? 16 : 5
  const urgentDays = rangeDays >= 30 ? 45 : 21
  const rescueDays = rangeDays >= 30 ? 14 : 7
  if (leadsWindow >= starThreshold) return 'ESTRELLA'
  if (leadsWindow === 0 && daysListedApprox >= urgentDays) return 'URGENTE'
  if (leadsWindow === 0 && daysListedApprox >= rescueDays) return 'RESCATE'
  if (leadsWindow <= 1) return 'ROTACION'
  return 'ROTACION'
}

export type InventoryRow = {
  id: string
  brand: string | null
  model: string | null
  year: number | null
  status: string | null
  location?: string | null
  price?: number | null
  created_at?: string | null
}

export function sinceIsoEcuador(rangeDays: number): string {
  const { y, m, day } = ecuadorCalendarParts()
  const d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0))
  d.setUTCDate(d.getUTCDate() - rangeDays)
  const ymd = toYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  return `${ymd}T00:00:00.000-05:00`
}

/** Mapea fila de interested_cars al id de inventario (inventory_id o vehicle_uid). */
function resolveInterestedCarInventoryId(
  row: { inventory_id?: string | null; vehicle_uid?: string | null },
  validIds: Set<string>
): string | null {
  if (row.inventory_id && validIds.has(String(row.inventory_id))) {
    return String(row.inventory_id)
  }
  if (row.vehicle_uid && validIds.has(String(row.vehicle_uid))) {
    return String(row.vehicle_uid)
  }
  return null
}

export async function fetchInventoryWithMetrics(supabase: SupabaseClient, rangeDays: 1 | 7 | 30) {
  const db = metricsDb(supabase)
  const sinceIso = sinceIsoEcuador(rangeDays)

  const { data: inv, error: invErr } = await db
    .from('inventoryoracle')
    .select('id, brand, model, year, status, location, price, created_at')
    .eq('location', 'patio')
    .neq('status', 'vendido')
    .order('brand', { ascending: true })

  if (invErr) throw invErr

  const inventory = (inv ?? []) as InventoryRow[]
  const ids = inventory.map((r) => r.id)
  const validIds = new Set(ids)

  const [{ data: leadsRows }, { data: metaRows }] = await Promise.all([
    db
      .from('interested_cars')
      .select('inventory_id, vehicle_uid, created_at')
      .gte('created_at', sinceIso)
      .limit(15000),
    db
      .from('meta_video_metrics')
      .select('inventory_vehicle_id, views, retention_rate')
      .not('inventory_vehicle_id', 'is', null),
  ])

  const leadsByVehicle = new Map<string, number>()
  for (const id of ids) leadsByVehicle.set(id, 0)
  for (const row of (leadsRows ?? []) as Array<{
    inventory_id?: string | null
    vehicle_uid?: string | null
  }>) {
    const invId = resolveInterestedCarInventoryId(row, validIds)
    if (!invId) continue
    leadsByVehicle.set(invId, (leadsByVehicle.get(invId) ?? 0) + 1)
  }

  type Agg = { views: number; retentionSum: number; retentionN: number }
  const metaByVehicle = new Map<string, Agg>()
  for (const row of (metaRows ?? []) as Array<{ inventory_vehicle_id?: string | null; views?: number | null; retention_rate?: number | null }>) {
    const id = row.inventory_vehicle_id
    if (!id) continue
    const cur = metaByVehicle.get(id) ?? { views: 0, retentionSum: 0, retentionN: 0 }
    cur.views += row.views ?? 0
    if (row.retention_rate != null) {
      cur.retentionSum += row.retention_rate
      cur.retentionN += 1
    }
    metaByVehicle.set(id, cur)
  }

  const now = Date.now()
  const rows = inventory.map((v) => {
    const leads7Or30 = leadsByVehicle.get(v.id) ?? 0
    const meta = metaByVehicle.get(v.id)
    const avgRetention = meta && meta.retentionN > 0 ? meta.retentionSum / meta.retentionN : null
    const created = v.created_at ? new Date(v.created_at).getTime() : now
    const daysListedApprox = Math.max(0, Math.floor((now - created) / (86400000)))
    const category = inferCategory(leads7Or30, daysListedApprox, rangeDays === 30 ? 30 : 7)
    const vehicle_label = [v.brand, v.model, v.year].filter(Boolean).join(' ')
    return {
      inventory_id: v.id,
      vehicle_label,
      status: v.status,
      location: v.location ?? null,
      price: v.price ?? null,
      leads_window: leads7Or30,
      views_video: meta?.views ?? 0,
      retention_pct: avgRetention == null ? null : avgRetention <= 1 ? avgRetention * 100 : avgRetention,
      category,
    }
  })

  return { rows, ids }
}
