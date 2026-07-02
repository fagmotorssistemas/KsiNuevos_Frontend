import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { campaignsFrom } from '@/lib/marketing/campaigns-db'
import {
  fetchCampaignInventory,
  inventorySegment,
  resolveCampaignDisplayPrice,
  type CampaignInventoryRow,
} from '@/lib/marketing/campaign-inventory'
import {
  inferCampaignSegment,
  normalizeCategoryToSegment,
} from '@/lib/marketing/campaign-segments'
import type {
  AvailableVehicleRow,
  CampaignCreator,
  CampaignDashboardPayload,
  CampaignGroupRow,
  CampaignSegment,
  CampaignSegmentStats,
  CampaignVehicleRow,
} from '@/types/marketing-campaigns'
import { currentCampaignMonth, vehicleTitle } from '@/types/marketing-campaigns'

export const dynamic = 'force-dynamic'

const EMPTY_SEGMENT_STATS: CampaignSegmentStats = {
  groups: 0,
  activeGroups: 0,
  assignedVehicles: 0,
  availableCount: 0,
  missingVideo: 0,
}

type GroupDbRow = {
  id: string
  name: string
  vehicle_category: string | null
  campaign_month: string
  status: CampaignGroupRow['status']
  sort_order: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  marketing_campaign_vehicles?: Array<{
    id: string
    group_id: string
    inventory_id: string
    sort_order: number
    notes: string | null
    video_status: CampaignVehicleRow['video_status']
    price_snapshot: number | null
    reels_count?: number | null
    posts_count?: number | null
    needs_video?: boolean | null
    needs_photos?: boolean | null
    inventoryoracle: CampaignInventoryRow | CampaignInventoryRow[] | null
  }>
}

async function fetchCreators(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  creatorIds: string[]
): Promise<Map<string, CampaignCreator>> {
  const map = new Map<string, CampaignCreator>()
  if (creatorIds.length === 0) return map

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('id', creatorIds)

  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      full_name: row.full_name,
      role: row.role ?? null,
    })
  }
  return map
}

async function fetchCampaignGroups(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  campaignMonth: string
): Promise<{ groups: GroupDbRow[]; tablesReady: boolean; groupsError?: string }> {
  const { data, error } = await campaignsFrom(supabase, 'marketing_campaign_groups')
    .select(
      `
      id, name, vehicle_category, campaign_month, status, sort_order, notes, created_by, created_at, updated_at,
      marketing_campaign_vehicles (
        id, group_id, inventory_id, sort_order, notes, video_status, price_snapshot, reels_count, posts_count, needs_video, needs_photos,
        inventoryoracle (
          id, brand, model, year, type_body, type, img_main_url, plate, price, internal_fixed_price
        )
      )
    `
    )
    .eq('campaign_month', campaignMonth)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[campaigns] groups query failed:', error.message)
    return { groups: [], tablesReady: false, groupsError: error.message }
  }

  return { groups: (data ?? []) as GroupDbRow[], tablesReady: true }
}

function buildSegmentStats(): Record<CampaignSegment, CampaignSegmentStats> {
  return {
    suv: { ...EMPTY_SEGMENT_STATS },
    sedan: { ...EMPTY_SEGMENT_STATS },
    camioneta: { ...EMPTY_SEGMENT_STATS },
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const campaignMonth = searchParams.get('month')?.trim() || currentCampaignMonth()

  try {
    const [groupsResult, inventoryRows] = await Promise.all([
      fetchCampaignGroups(supabase, campaignMonth),
      fetchCampaignInventory(supabase),
    ])

    const inventory = inventoryRows
    const { groups: rawGroups, tablesReady, groupsError } = groupsResult

    const creatorIds = [
      ...new Set(rawGroups.map((g) => g.created_by).filter((id): id is string => Boolean(id))),
    ]
    const creators = await fetchCreators(supabase, creatorIds)

    const assignedIds = new Set<string>()
    let missingVideo = 0
    const segmentStats = buildSegmentStats()

    const groups: CampaignGroupRow[] = rawGroups.map((group) => {
      const segment =
        normalizeCategoryToSegment(group.vehicle_category) ??
        normalizeCategoryToSegment(group.name) ??
        'suv'

      const vehicles: CampaignVehicleRow[] = (group.marketing_campaign_vehicles ?? [])
        .map((v) => {
          const inv = Array.isArray(v.inventoryoracle) ? v.inventoryoracle[0] : v.inventoryoracle
          if (!inv) return null
          assignedIds.add(v.inventory_id)

          const reelsCount = Math.max(0, Number(v.reels_count ?? 0))
          const postsCount = Math.max(0, Number(v.posts_count ?? 0))
          const needsVideo = Boolean(v.needs_video)
          const needsPhotos = Boolean(v.needs_photos)

          if (needsVideo) {
            missingVideo += 1
            segmentStats[segment].missingVideo += 1
          }

          return {
            id: v.id,
            group_id: v.group_id,
            inventory_id: v.inventory_id,
            sort_order: v.sort_order,
            notes: v.notes,
            video_status: v.video_status,
            price_snapshot: v.price_snapshot,
            brand: inv.brand,
            model: inv.model,
            year: inv.year,
            type_body: inv.type_body,
            img_main_url: inv.img_main_url,
            plate: inv.plate,
            display_price: resolveCampaignDisplayPrice({
              price_snapshot: v.price_snapshot,
              internal_fixed_price: inv.internal_fixed_price,
              price: inv.price,
            }),
            reelsCount,
            postsCount,
            needsVideo,
            needsPhotos,
            segment: inferCampaignSegment(inv),
          }
        })
        .filter((v): v is CampaignVehicleRow => v != null)
        .sort((a, b) => a.sort_order - b.sort_order)

      const needsVideoVehicles = vehicles
        .filter((v) => v.needsVideo)
        .map((v) => vehicleTitle(v.brand, v.model, v.year))
      const needsPhotosVehicles = vehicles
        .filter((v) => v.needsPhotos)
        .map((v) => vehicleTitle(v.brand, v.model, v.year))

      segmentStats[segment].groups += 1
      if (group.status === 'active') segmentStats[segment].activeGroups += 1
      segmentStats[segment].assignedVehicles += vehicles.length

      const creator = group.created_by ? creators.get(group.created_by) ?? null : null

      return {
        id: group.id,
        name: group.name,
        vehicle_category: group.vehicle_category,
        segment,
        campaign_month: group.campaign_month,
        status: group.status,
        sort_order: group.sort_order,
        notes: group.notes,
        created_at: group.created_at,
        updated_at: group.updated_at,
        created_by: group.created_by,
        creator,
        vehicles,
        needsVideoVehicles,
        needsPhotosVehicles,
      }
    })

    const availableVehicles: AvailableVehicleRow[] = inventory
      .filter((row) => !assignedIds.has(row.id))
      .map((row) => ({
        id: row.id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        type_body: row.type_body,
        status: row.status,
        img_main_url: row.img_main_url,
        plate: row.plate,
        display_price: resolveCampaignDisplayPrice(row),
        segment: inventorySegment(row),
      }))
      .sort((a, b) => (b.display_price ?? 0) - (a.display_price ?? 0))

    for (const row of availableVehicles) {
      if (row.segment) segmentStats[row.segment].availableCount += 1
    }

    const payload: CampaignDashboardPayload = {
      campaignMonth,
      groups,
      availableVehicles,
      segmentStats,
      stats: {
        totalGroups: groups.length,
        activeGroups: groups.filter((g) => g.status === 'active').length,
        assignedVehicles: assignedIds.size,
        availableCount: availableVehicles.length,
        missingVideo,
      },
      tablesReady,
      groupsError,
      totalInventory: inventory.length,
    }

    return NextResponse.json(payload)
  } catch (err) {
    const inventoryError = err instanceof Error ? err.message : 'Error al cargar inventario'
    console.error('[campaigns] inventory failed:', inventoryError)
    return NextResponse.json({ error: inventoryError }, { status: 500 })
  }
}
