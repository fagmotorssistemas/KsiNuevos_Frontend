import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getSignedUrlForPath } from './storage'
import {
  formatBytes,
  resolveJobVehicleLabel,
  vehicleIdFromJobMeta,
  type InventoryVehicleSnippet,
} from './resolve-job-vehicle'
import type {
  RawClipItem,
  RawClipsFolderSummary,
  RawClipsLibraryStats,
} from './raw-clips-types'

export type {
  RawClipItem,
  RawClipsFolderSummary,
  RawClipsLibraryStats,
  InventoryVehicleSnippet,
} from './raw-clips-types'

const RAW_BUCKET = 'raw-videos-v2'
const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i

type StorageObjectRow = {
  name: string
  metadata: { size?: number } | null
  updated_at: string | null
  created_at: string | null
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type JobRow = Database['public']['Tables']['video_jobs_v2']['Row']

function isVideoClipPath(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  if (base.toLowerCase().startsWith('guion_') && base.toLowerCase().endsWith('.pdf')) return false
  return VIDEO_EXT.test(base)
}

function clipIndexFromPath(path: string): number | null {
  const base = path.split('/').pop() ?? ''
  const m = /^clip_(\d+)_/i.exec(base)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function countVideoClips(paths: string[] | null | undefined): number {
  return (paths ?? []).filter(isVideoClipPath).length
}

function parseObjectSizeBytes(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const m = metadata as Record<string, unknown>
  for (const key of ['size', 'contentLength']) {
    const val = m[key]
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val
    if (typeof val === 'string') {
      const n = Number(val)
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return 0
}

async function fetchStorageObjectsForJob(jobId: string): Promise<StorageObjectRow[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage.from(RAW_BUCKET).list(jobId, {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) {
    console.error('[raw-clips-library] storage.list', jobId, error.message)
    return []
  }

  return (data ?? [])
    .filter((f) => f.id != null && f.name)
    .map((f) => ({
      name: `${jobId}/${f.name}`,
      metadata:
        f.metadata && typeof f.metadata === 'object'
          ? (f.metadata as { size?: number })
          : null,
      updated_at: f.updated_at ?? null,
      created_at: f.created_at ?? null,
    }))
}

function buildStorageAggMap(
  storageRows: StorageObjectRow[],
  jobIds: string[]
): Map<string, { bytes: number; clipCount: number; updatedAt: string | null }> {
  const map = new Map<string, { bytes: number; clipCount: number; updatedAt: string | null }>()
  const idSet = new Set(jobIds)

  for (const row of storageRows) {
    const slash = row.name.indexOf('/')
    if (slash <= 0) continue
    const jobId = row.name.slice(0, slash)
    if (!idSet.has(jobId)) continue
    if (!isVideoClipPath(row.name)) continue

    const size = parseObjectSizeBytes(row.metadata)
    const prev = map.get(jobId) ?? { bytes: 0, clipCount: 0, updatedAt: null }
    prev.bytes += size
    prev.clipCount += 1
    const updated = row.updated_at
    if (updated && (!prev.updatedAt || updated > prev.updatedAt)) {
      prev.updatedAt = updated
    }
    map.set(jobId, prev)
  }

  return map
}

/** Agrega bytes/clips por job listando cada carpeta en Storage (service role). */
async function fetchStorageAggForJobIds(
  jobIds: string[]
): Promise<Map<string, { bytes: number; clipCount: number; updatedAt: string | null }>> {
  const unique = [...new Set(jobIds.filter(Boolean))]
  if (!unique.length) return new Map()

  const CONCURRENCY = 12
  const rows: StorageObjectRow[] = []
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY)
    const batchRows = await Promise.all(batch.map((id) => fetchStorageObjectsForJob(id)))
    rows.push(...batchRows.flat())
  }

  return buildStorageAggMap(rows, unique)
}

async function fetchInventoryMap(ids: string[]): Promise<Map<string, InventoryVehicleSnippet>> {
  const map = new Map<string, InventoryVehicleSnippet>()
  if (!ids.length) return map

  const supabase = getServiceClient()
  const unique = [...new Set(ids)]
  const chunk = 80
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const { data } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year, plate, status')
      .in('id', slice)
    for (const row of data ?? []) {
      map.set(row.id, {
        id: row.id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        plate: row.plate,
        status: row.status,
      })
    }
  }
  return map
}

async function fetchQueueVehicleMap(jobIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!jobIds.length) return map

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('video_publishing_queue')
    .select('video_id, vehicle_id')
    .in('video_id', jobIds)
    .not('vehicle_id', 'is', null)

  for (const row of data ?? []) {
    if (row.video_id && row.vehicle_id && !map.has(row.video_id)) {
      map.set(row.video_id, row.vehicle_id)
    }
  }
  return map
}

async function fetchScriptVehicleMap(scriptIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(scriptIds.filter(Boolean))]
  if (!unique.length) return map

  const supabase = getServiceClient()
  const { data } = await supabase.from('video_scripts').select('id, vehicle_id').in('id', unique)
  for (const row of data ?? []) {
    if (row.id && row.vehicle_id) map.set(row.id, row.vehicle_id)
  }
  return map
}

function jobMatchesSearch(
  job: JobRow,
  resolvedTitle: string,
  inventory: InventoryVehicleSnippet | null,
  q: string
): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [
    job.id,
    job.job_name,
    job.vehicle_line_1,
    job.vehicle_line_2,
    job.vehicle_line_4,
    job.inventory_vehicle_id,
    resolvedTitle,
    inventory?.brand,
    inventory?.model,
    inventory?.plate,
    inventory?.id,
    job.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function buildFolderSummary(
  job: JobRow,
  storageAgg: { bytes: number; clipCount: number; updatedAt: string | null } | undefined,
  inventory: InventoryVehicleSnippet | null
): RawClipsFolderSummary {
  const resolved = resolveJobVehicleLabel(job, inventory)
  const pathsCount = countVideoClips(job.raw_video_paths)
  const clipCount = Math.max(pathsCount, storageAgg?.clipCount ?? 0)
  const inventoryVehicleId = job.inventory_vehicle_id?.trim() || resolved.vehicleId

  return {
    id: job.id,
    title: resolved.title,
    subtitle: resolved.subtitle,
    inventoryVehicleId,
    vehicleId: resolved.vehicleId,
    inventory: resolved.inventory,
    jobName: job.job_name,
    vehicleLine2: job.vehicle_line_2,
    status: job.status,
    flowType: job.flow_type,
    clipCount,
    totalBytes: storageAgg?.bytes ?? 0,
    createdAt: job.created_at ?? new Date(0).toISOString(),
    updatedAt: storageAgg?.updatedAt ?? job.updated_at ?? job.created_at ?? new Date(0).toISOString(),
    finalVideoUrl: job.final_video_url,
    socialPublishStage: job.social_publish_stage,
  }
}

async function enrichJobs(jobs: JobRow[]) {
  const jobIds = jobs.map((j) => j.id)
  const scriptIds = jobs.map((j) => j.video_script_id).filter((id): id is string => Boolean(id))

  const [storageAggMap, queueMap, scriptMap] = await Promise.all([
    fetchStorageAggForJobIds(jobIds),
    fetchQueueVehicleMap(jobIds),
    fetchScriptVehicleMap(scriptIds),
  ])

  const vehicleIds: string[] = []
  for (const job of jobs) {
    const scriptVid = job.video_script_id ? scriptMap.get(job.video_script_id) : null
    const queueVid = queueMap.get(job.id)
    const vid = vehicleIdFromJobMeta(
      job.selected_clips,
      scriptVid,
      queueVid,
      job.inventory_vehicle_id
    )
    if (vid) vehicleIds.push(vid)
  }
  const inventoryMap = await fetchInventoryMap(vehicleIds)

  return jobs.map((job) => {
    const scriptVid = job.video_script_id ? scriptMap.get(job.video_script_id) : null
    const queueVid = queueMap.get(job.id)
    const vid = vehicleIdFromJobMeta(
      job.selected_clips,
      scriptVid,
      queueVid,
      job.inventory_vehicle_id
    )
    const inventory = vid ? inventoryMap.get(vid) ?? null : null
    const resolved = resolveJobVehicleLabel(job, inventory)
    return {
      job,
      inventory,
      resolvedTitle: resolved.title,
      resolvedVehicleId: vid,
      storageAgg: storageAggMap.get(job.id),
    }
  })
}

export async function fetchRawClipsLibrary(params: {
  q?: string
  status?: string
  page?: number
  pageSize?: number
  /** Filtra carpetas al vehículo del inventario (`inventory_vehicle_id` o resolución legacy). */
  inventoryVehicleId?: string
}): Promise<{
  folders: RawClipsFolderSummary[]
  stats: RawClipsLibraryStats
  page: number
  pageSize: number
  total: number
}> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(60, Math.max(12, params.pageSize ?? 24))
  const q = params.q?.trim() ?? ''
  const statusFilter = params.status?.trim()
  const inventoryVehicleId = params.inventoryVehicleId?.trim() ?? ''

  const supabase = getServiceClient()

  let query = supabase
    .from('video_jobs_v2')
    .select('*')
    .neq('flow_type', 'noticiero')
    .order('created_at', { ascending: false })

  if (inventoryVehicleId) {
    query = query.eq('inventory_vehicle_id', inventoryVehicleId)
  }

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: allJobs, error } = await query
  if (error) throw new Error(error.message)

  const jobs = (allJobs ?? []).filter(
    (j) => countVideoClips(j.raw_video_paths) > 0 || (j.raw_video_paths?.length ?? 0) > 0
  )

  const enriched = await enrichJobs(jobs)

  const filtered = enriched.filter((row) => {
    if (inventoryVehicleId && row.resolvedVehicleId !== inventoryVehicleId) return false
    return jobMatchesSearch(row.job, row.resolvedTitle, row.inventory, q)
  })

  const total = filtered.length
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize)
  const folders = slice.map((row) =>
    buildFolderSummary(row.job, row.storageAgg, row.inventory)
  )

  let totalClips = 0
  let totalBytes = 0
  for (const row of filtered) {
    const summary = buildFolderSummary(row.job, row.storageAgg, row.inventory)
    totalClips += summary.clipCount
    totalBytes += summary.totalBytes
  }

  return {
    folders,
    stats: {
      totalFolders: total,
      totalClips,
      totalBytes,
    },
    page,
    pageSize,
    total,
  }
}

export async function fetchRawClipsFolderDetail(jobId: string): Promise<{
  folder: RawClipsFolderSummary
  clips: RawClipItem[]
} | null> {
  const supabase = getServiceClient()

  const { data: job, error } = await supabase.from('video_jobs_v2').select('*').eq('id', jobId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!job) return null

  const jobStorageRows = await fetchStorageObjectsForJob(jobId)

  const [queueMap, scriptMap] = await Promise.all([
    fetchQueueVehicleMap([jobId]),
    job.video_script_id ? fetchScriptVehicleMap([job.video_script_id]) : Promise.resolve(new Map()),
  ])

  const scriptVid = job.video_script_id ? scriptMap.get(job.video_script_id) : null
  const queueVid = queueMap.get(jobId)
  const vehicleId = vehicleIdFromJobMeta(
    job.selected_clips,
    scriptVid,
    queueVid,
    (job as { inventory_vehicle_id?: string | null }).inventory_vehicle_id
  )
  const inventoryMap = vehicleId ? await fetchInventoryMap([vehicleId]) : new Map()
  const inventory = vehicleId ? inventoryMap.get(vehicleId) ?? null : null
  const storageAgg = buildStorageAggMap(jobStorageRows, [jobId]).get(jobId)

  const pathSet = new Set<string>()
  for (const p of job.raw_video_paths ?? []) {
    if (isVideoClipPath(p)) pathSet.add(p)
  }
  for (const row of jobStorageRows) {
    if (isVideoClipPath(row.name)) pathSet.add(row.name)
  }

  const clipMeta = new Map<string, { sizeBytes: number; createdAt: string | null }>()
  for (const row of jobStorageRows) {
    if (!pathSet.has(row.name)) continue
    clipMeta.set(row.name, {
      sizeBytes: parseObjectSizeBytes(row.metadata),
      createdAt: row.created_at,
    })
  }

  const paths = [...pathSet].sort((a, b) => {
    const ia = clipIndexFromPath(a)
    const ib = clipIndexFromPath(b)
    if (ia != null && ib != null) return ia - ib
    return a.localeCompare(b)
  })

  const clips: RawClipItem[] = await Promise.all(
    paths.map(async (path) => {
      const meta = clipMeta.get(path)
      const signedUrl = await getSignedUrlForPath(path)
      return {
        path,
        name: path.split('/').pop() ?? path,
        signedUrl,
        sizeBytes: meta?.sizeBytes ?? 0,
        createdAt: meta?.createdAt ?? null,
        clipIndex: clipIndexFromPath(path),
      }
    })
  )

  const folder = buildFolderSummary(job, storageAgg, inventory)
  folder.clipCount = clips.length
  folder.totalBytes = clips.reduce((sum, c) => sum + c.sizeBytes, 0)

  return { folder, clips }
}

export { formatBytes }
