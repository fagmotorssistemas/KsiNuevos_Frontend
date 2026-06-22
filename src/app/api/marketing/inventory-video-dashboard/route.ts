import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

type CarStatus = Database['public']['Enums']['car_status']

const PAGE_SIZE_DEFAULT = 25
const PAGE_SIZE_MAX = 100
const INVENTORY_FETCH_BATCH = 800
const QUEUE_FETCH_BATCH = 1000
const JOBS_FETCH_BATCH = 1000
const MAX_INVENTORY_ROWS = 15000

type QueueAgg = {
  published: Set<string>
  pending: Set<string>
  failed: Set<string>
  cancelled: Set<string>
}

function emptyAgg(): QueueAgg {
  return {
    published: new Set(),
    pending: new Set(),
    failed: new Set(),
    cancelled: new Set(),
  }
}

function addVideoForStatus(agg: QueueAgg, status: string, videoId: string) {
  switch (status) {
    case 'published':
      agg.published.add(videoId)
      break
    case 'pending':
    case 'publishing':
      agg.pending.add(videoId)
      break
    case 'failed':
      agg.failed.add(videoId)
      break
    case 'cancelled':
      agg.cancelled.add(videoId)
      break
    default:
      break
  }
}

function resolveInventoryVehicleId(
  jobInventoryVehicleId: string | null | undefined,
  queueVehicleId: string | null | undefined
): string | null {
  const fromJob = jobInventoryVehicleId?.trim()
  if (fromJob) return fromJob
  const fromQueue = queueVehicleId?.trim()
  return fromQueue || null
}

function parseInventoryStatusGroup(raw: string | null): CarStatus[] | null {
  if (!raw || raw === 'all') return null
  const map: Record<string, CarStatus[]> = {
    disponible: ['disponible'],
    vendido: ['vendido'],
    reservado: ['reservado'],
    mantenimiento: ['mantenimiento'],
    devuelto: ['devuelto'],
    consignacion: ['consignacion'],
    conwilsonhernan: ['conwilsonhernan'],
    otros: ['mantenimiento', 'devuelto', 'consignacion', 'conwilsonhernan'],
  }
  return map[raw] ?? null
}

function escapeIlike(q: string) {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * GET — Inventario + conteos por vehículo:
 * - `uniqueGenerated`: reels completados o fallidos con `video_jobs_v2.inventory_vehicle_id`
 * - `uniqueFailed`: jobs con error de pipeline + publicaciones fallidas en cola (sin duplicar IDs)
 * - Publicación: cola unida al job; agrupa por FK del job (fallback `queue.vehicle_id` legacy)
 */
export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get('pageSize') ?? String(PAGE_SIZE_DEFAULT)) || PAGE_SIZE_DEFAULT)
  )
  const qRaw = (url.searchParams.get('q') ?? '').trim()
  const inventoryStatus = url.searchParams.get('inventoryStatus') ?? 'all'
  const coverage = url.searchParams.get('coverage') ?? 'all'
  const sort = url.searchParams.get('sort') ?? 'generated_desc'

  const supabase = await createServerSupabaseClient()

  /** 1) Reels completados o fallidos vinculados al inventario. */
  const generatedAgg = new Map<string, Set<string>>()
  const pipelineFailedAgg = new Map<string, Set<string>>()
  let jOffset = 0
  for (;;) {
    const { data: jobChunk, error: jobErr } = await supabase
      .from('video_jobs_v2')
      .select('id, inventory_vehicle_id, status')
      .neq('flow_type', 'noticiero')
      .in('status', ['completed', 'failed'])
      .not('inventory_vehicle_id', 'is', null)
      .range(jOffset, jOffset + JOBS_FETCH_BATCH - 1)

    if (jobErr) {
      console.error('[inventory-video-dashboard] jobs', jobErr)
      return NextResponse.json({ error: jobErr.message }, { status: 500 })
    }
    const rows = jobChunk ?? []
    for (const row of rows) {
      const vid = row.inventory_vehicle_id as string
      const jobId = row.id as string
      if (!vid || !jobId) continue
      let set = generatedAgg.get(vid)
      if (!set) {
        set = new Set()
        generatedAgg.set(vid, set)
      }
      set.add(jobId)
      if (row.status === 'failed') {
        let failedSet = pipelineFailedAgg.get(vid)
        if (!failedSet) {
          failedSet = new Set()
          pipelineFailedAgg.set(vid, failedSet)
        }
        failedSet.add(jobId)
      }
    }
    if (rows.length < JOBS_FETCH_BATCH) break
    jOffset += JOBS_FETCH_BATCH
    if (jOffset > 50000) break
  }

  /** 2) Cola de publicación → agrupada por inventario del job (FK), no solo queue.vehicle_id. */
  const queueAgg = new Map<string, QueueAgg>()
  let qOffset = 0
  for (;;) {
    const { data: queueChunk, error: queueErr } = await supabase
      .from('video_publishing_queue')
      .select('video_id, status, vehicle_id, video_jobs_v2 ( inventory_vehicle_id )')
      .range(qOffset, qOffset + QUEUE_FETCH_BATCH - 1)

    if (queueErr) {
      console.error('[inventory-video-dashboard] queue', queueErr)
      return NextResponse.json({ error: queueErr.message }, { status: 500 })
    }
    const rows = queueChunk ?? []
    for (const row of rows) {
      const videoId = row.video_id as string
      if (!videoId) continue
      const jobJoin = row.video_jobs_v2 as { inventory_vehicle_id?: string | null } | null
      const vid = resolveInventoryVehicleId(jobJoin?.inventory_vehicle_id, row.vehicle_id as string | null)
      if (!vid) continue
      let agg = queueAgg.get(vid)
      if (!agg) {
        agg = emptyAgg()
        queueAgg.set(vid, agg)
      }
      addVideoForStatus(agg, String(row.status), videoId)
    }
    if (rows.length < QUEUE_FETCH_BATCH) break
    qOffset += QUEUE_FETCH_BATCH
    if (qOffset > 50000) break
  }

  /** 3) Inventario filtrado (campos mínimos), por lotes. */
  const statusFilter = parseInventoryStatusGroup(inventoryStatus)
  const searchEscaped = qRaw ? escapeIlike(qRaw) : ''

  const inventoryRows: Array<{
    id: string
    brand: string
    model: string
    year: number
    version: string | null
    status: CarStatus | null
    updated_at: string | null
    plate: string | null
  }> = []

  let invOffset = 0
  for (;;) {
    let invQuery = supabase
      .from('inventoryoracle')
      .select('id, brand, model, year, version, status, updated_at, plate')
      .order('brand', { ascending: true })
      .order('model', { ascending: true })
      .range(invOffset, invOffset + INVENTORY_FETCH_BATCH - 1)

    if (statusFilter && statusFilter.length > 0) {
      invQuery = invQuery.in('status', statusFilter)
    }

    if (searchEscaped) {
      const pattern = `%${searchEscaped}%`
      invQuery = invQuery.or(
        `brand.ilike.${pattern},model.ilike.${pattern},vin.ilike.${pattern},plate.ilike.${pattern}`
      )
    }

    const { data: invChunk, error: invErr } = await invQuery
    if (invErr) {
      console.error('[inventory-video-dashboard] inventory', invErr)
      return NextResponse.json({ error: invErr.message }, { status: 500 })
    }
    const chunk = invChunk ?? []
    inventoryRows.push(...(chunk as typeof inventoryRows))
    if (chunk.length < INVENTORY_FETCH_BATCH) break
    invOffset += INVENTORY_FETCH_BATCH
    if (inventoryRows.length >= MAX_INVENTORY_ROWS) break
  }

  /** 4) Enriquecer + filtro cobertura. */
  type Enriched = (typeof inventoryRows)[number] & {
    uniqueGenerated: number
    uniquePublished: number
    uniquePending: number
    uniqueFailed: number
    uniqueCancelled: number
  }

  let enriched: Enriched[] = inventoryRows.map((row) => {
    const generated = generatedAgg.get(row.id)
    const agg = queueAgg.get(row.id) ?? emptyAgg()
    const failedIds = new Set<string>([
      ...(pipelineFailedAgg.get(row.id) ?? []),
      ...agg.failed,
    ])
    return {
      ...row,
      uniqueGenerated: generated?.size ?? 0,
      uniquePublished: agg.published.size,
      uniquePending: agg.pending.size,
      uniqueFailed: failedIds.size,
      uniqueCancelled: agg.cancelled.size,
    }
  })

  if (coverage === 'with_published') {
    enriched = enriched.filter((r) => r.uniquePublished > 0)
  } else if (coverage === 'without_published') {
    enriched = enriched.filter((r) => r.uniquePublished === 0)
  } else if (coverage === 'with_generated') {
    enriched = enriched.filter((r) => r.uniqueGenerated > 0)
  } else if (coverage === 'without_generated') {
    enriched = enriched.filter((r) => r.uniqueGenerated === 0)
  }

  /** 5) Ordenamiento. */
  const cmpStr = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })
  enriched.sort((a, b) => {
    switch (sort) {
      case 'generated_desc':
        return b.uniqueGenerated - a.uniqueGenerated || cmpStr(a.brand, b.brand)
      case 'generated_asc':
        return a.uniqueGenerated - b.uniqueGenerated || cmpStr(a.brand, b.brand)
      case 'published_asc':
        return a.uniquePublished - b.uniquePublished || cmpStr(a.brand, b.brand)
      case 'published_desc':
        return b.uniquePublished - a.uniquePublished || cmpStr(a.brand, b.brand)
      case 'pending_desc':
        return b.uniquePending - a.uniquePending || cmpStr(a.brand, b.brand)
      case 'failed_desc':
        return b.uniqueFailed - a.uniqueFailed || cmpStr(a.brand, b.brand)
      case 'brand_asc':
        return cmpStr(a.brand, b.brand) || cmpStr(a.model, b.model) || a.year - b.year
      case 'updated_desc': {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
        return tb - ta
      }
      default:
        return b.uniqueGenerated - a.uniqueGenerated || cmpStr(a.brand, b.brand)
    }
  })

  const total = enriched.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const slice = enriched.slice(start, start + pageSize)

  const [{ count: totalRegistered }, { count: totalActive }, { count: totalBaja }] = await Promise.all([
    supabase.from('inventoryoracle').select('*', { count: 'exact', head: true }),
    supabase.from('inventoryoracle').select('*', { count: 'exact', head: true }).eq('status', 'disponible'),
    supabase.from('inventoryoracle').select('*', { count: 'exact', head: true }).eq('status', 'vendido'),
  ])

  return NextResponse.json({
    rows: slice,
    total,
    page: safePage,
    pageSize,
    totalPages,
    capped: inventoryRows.length >= MAX_INVENTORY_ROWS,
    kpiSummary: {
      totalVehiculosRegistrados: totalRegistered ?? 0,
      totalActivos: totalActive ?? 0,
      totalBaja: totalBaja ?? 0,
    },
  })
}
