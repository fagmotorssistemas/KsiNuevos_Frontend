import type { SupabaseClient } from '@supabase/supabase-js'

import { metricsDb } from './db'
import type { DailyMetricsReportRow } from './daily-metrics-report'
import { ecuadorCalendarParts, getEcuadorTodayYmd, toYmd } from './daily-metrics-report'
import { fetchInventoryWithMetrics } from './inventory-metrics'
import { isAppointmentPendingActive, isBotSuggestionVisible } from '@/lib/agenda/bot-suggestions'

/** Mes de campaña `YYYY-MM` (calendario Ecuador). */
export type MetricasCampaignMonth = string

export type CampaignRankRow = {
  campaign_id: string
  campaign_name: string
  reportDate: string | null
  spend: number
  leads: number
  reach: number
  impressions: number
  clicks: number
  cpl: number | null
  costPerLeadStored: number | null
  dateStart: string | null
  dateStop: string | null
  /** Etiqueta(s) de auto desde meta_ad_vehicle_metrics */
  autoLabel: string | null
  isGeneral: boolean
  adsCount: number | null
}

/** Contactos reales por vehículo (leads × interested_cars, fecha = leads.created_at). */
export type VehicleLeadsRow = {
  inventoryId: string
  vehicleLabel: string
  leadsCampanas: number
  leadsOrganicos: number
  leadsTotal: number
  /** Suma de spend en meta_ad_vehicle_metrics (todas sus campañas). */
  spendCampanas: number
  cplReal: number | null
  campaignCount: number
  /** Por vehículo: columnas reach_sum / impressions_sum / clicks_sum en meta_ad_vehicle_metrics. */
  reachSum: number
  impressionsSum: number
  clicksSum: number
  /** Leads en ventana de campaña del auto, pico en lead_temperature_daily (ventana date_start→date_stop). */
  leadsCaliente: number
  leadsTibio: number
  leadsFrio: number
  inventoryStatus: string | null
  isVendido: boolean
  /** Visitas showroom (visit_start) en ventana de campaña del auto, mismo criterio que leads campañas. */
  showroomVisitas: number
  /** Sugerencias IA con leads.created_at en ventana de campaña del auto. */
  citasIa: number
}

type LeadTemperaturePeak = 'frio' | 'tibio' | 'caliente'

type CampaignWindowRow = {
  campaign_id: string
  date_start: string | null
  date_stop: string | null
  updated_at?: string | null
}

export type VehicleVideoViewsRow = {
  inventoryId: string | null
  vehicleLabel: string
  brand: string
  model: string
  year: number | null
  views: number
  retentionAvgPct: number | null
  videoCount: number
}

/** @deprecated alias */
export type BrandViewsRow = VehicleVideoViewsRow

export type DashboardMetrics = {
  campaignMonth: MetricasCampaignMonth
  monthLabel: string
  sinceIso: string
  sinceReportDate: string
  untilReportDate: string
  contacts: {
    total: number
    organico: number
    withActiveCampaign: number
    withoutCampaign: number
    autosSinContactos: number
    estimatedCpl: number | null
    trendVsPrior: number | null
  }
  paid: {
    spendTotal: number
    contactsFromAds: number
    cplReal: number | null
    reachTotal: number
    impressionsTotal: number
    clicksTotal: number
    ctrPct: number | null
    activeCampaigns: number
    campaignsWithSpend: number
    vehiclesWithAds: number
    generalCampaignsCount: number
    snapshotDatesUsed: string[]
    latestSnapshotDate: string | null
    usedFallbackSnapshot: boolean
    topCampaigns: CampaignRankRow[]
    allCampaigns: CampaignRankRow[]
    byVehicle: VehicleLeadsRow[]
    /** Patio disponible sin fila en meta_ad_vehicle_metrics / campaña en el mes. */
    byVehicleNeutral: VehicleLeadsRow[]
  }
  organic: {
    viewsTotal: number
    activeVideos: number
    retentionAvgPct: number | null
    bestVehicle: string | null
    bestVehicleViews: number
    vehicles: VehicleVideoViewsRow[]
  }
  narrative: {
    reportDate: string | null
    excerpt: string | null
  }
}

export function getCurrentCampaignMonthYmd(): MetricasCampaignMonth {
  const { y, m } = ecuadorCalendarParts()
  return `${y}-${String(m).padStart(2, '0')}`
}

export function campaignMonthRange(
  campaignMonth: MetricasCampaignMonth,
  todayYmd = getEcuadorTodayYmd()
) {
  const [y, m] = campaignMonth.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) {
    throw new Error(`Mes de campaña inválido: ${campaignMonth}`)
  }
  const sinceReportDate = toYmd(y, m, 1)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const untilReportDate = toYmd(y, m, lastDay)
  const sinceIso = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)).toISOString()
  const periodEndIso =
    untilReportDate >= todayYmd
      ? new Date().toISOString()
      : new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999)).toISOString()
  const monthLabelRaw = new Intl.DateTimeFormat('es-EC', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(Date.UTC(y, m - 1, 1, 12, 0, 0)))
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)
  return { sinceIso, periodEndIso, sinceReportDate, untilReportDate, monthLabel }
}

export function campaignOverlapsMonth(
  dateStart: string | null,
  dateStop: string | null,
  sinceReportDate: string,
  untilReportDate: string
): boolean {
  const campStart = (dateStart ?? sinceReportDate).slice(0, 10)
  const campEnd = (dateStop ?? untilReportDate).slice(0, 10)
  return campStart <= untilReportDate && campEnd >= sinceReportDate
}

type CampaignLevelRowDb = {
  campaign_id: string
  reach: number | null
  impressions: number | null
  clicks: number | null
  date_start: string | null
  date_stop: string | null
  updated_at?: string | null
}

export type CampaignLevelMetrics = {
  reach: number
  impressions: number
  clicks: number
}

/**
 * KPIs a nivel campaña: reach, impresiones y clics desde meta_campaign_metrics.
 * No usar meta_ad_vehicle_metrics para reach/impresiones/clics (ahí suelen ir 0).
 */
export async function fetchPaidCampaignLevelMetrics(
  db: ReturnType<typeof metricsDb>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<{
  reachTotal: number
  impressionsTotal: number
  clicksTotal: number
  byCampaignId: Map<string, CampaignLevelMetrics>
}> {
  const { data, error } = await db
    .from('meta_campaign_metrics')
    .select('campaign_id, reach, impressions, clicks, date_start, date_stop, updated_at')
    .limit(10000)
  if (error) throw error

  const latestByCampaign = latestSnapshotPerCampaign((data ?? []) as CampaignLevelRowDb[])
  const byCampaignId = new Map<string, CampaignLevelMetrics>()
  let reachTotal = 0
  let impressionsTotal = 0
  let clicksTotal = 0

  for (const row of latestByCampaign) {
    const cid = String(row.campaign_id ?? '')
    if (!cid) continue
    if (!campaignOverlapsMonth(row.date_start, row.date_stop, sinceReportDate, untilReportDate)) {
      continue
    }
    const metrics: CampaignLevelMetrics = {
      reach: num(row.reach),
      impressions: num(row.impressions),
      clicks: num(row.clicks),
    }
    byCampaignId.set(cid, metrics)
    reachTotal += metrics.reach
    impressionsTotal += metrics.impressions
    clicksTotal += metrics.clicks
  }

  return { reachTotal, impressionsTotal, clicksTotal, byCampaignId }
}

/** @deprecated usar fetchPaidCampaignLevelMetrics */
export async function fetchPaidCampaignReachTotal(
  db: ReturnType<typeof metricsDb>,
  sinceReportDate: string,
  untilReportDate: string
) {
  const r = await fetchPaidCampaignLevelMetrics(db, sinceReportDate, untilReportDate)
  const reachByCampaignId = new Map<string, number>()
  for (const [cid, m] of r.byCampaignId) reachByCampaignId.set(cid, m.reach)
  return { reachTotal: r.reachTotal, reachByCampaignId }
}

/** Meses con campañas o snapshots en BD (más reciente primero). */
export async function fetchCampaignMonthOptions(
  supabase: SupabaseClient
): Promise<MetricasCampaignMonth[]> {
  const db = metricsDb(supabase)
  const { data, error } = await db
    .from('meta_campaign_metrics')
    .select('date_start, updated_at')
    .limit(10000)
  if (error) throw error

  const months = new Set<MetricasCampaignMonth>()
  months.add(getCurrentCampaignMonthYmd())
  for (const row of data ?? []) {
    const ds = (row as { date_start?: string | null }).date_start
    const ua = (row as { updated_at?: string | null }).updated_at
    if (ds) months.add(String(ds).slice(0, 7))
    if (ua) months.add(String(ua).slice(0, 7))
  }
  return [...months].sort((a, b) => b.localeCompare(a))
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** retention_rate en BD suele venir 0–100; si es ≤1 se interpreta como fracción. */
function retentionToDisplayPct(rate: unknown): number {
  const n = num(rate)
  if (n <= 0) return 0
  return n <= 1 ? n * 100 : n
}

type VideoMetricsRowDb = {
  video_id: string
  views: number | null
  retention_rate: number | null
  inventory_vehicle_id: string | null
  parsed_brand: string | null
  parsed_model: string | null
  parsed_year: number | null
  inventoryoracle?:
    | { brand: string | null; model: string | null; year: number | null }
    | Array<{ brand: string | null; model: string | null; year: number | null }>
    | null
}

function resolveVideoVehicle(row: VideoMetricsRowDb): {
  inventoryId: string | null
  vehicleLabel: string
  brand: string
  model: string
  year: number | null
} {
  const invRaw = row.inventoryoracle
  const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw
  const brand = String(inv?.brand ?? row.parsed_brand ?? '').trim()
  const model = String(inv?.model ?? row.parsed_model ?? '').trim()
  const year = inv?.year ?? row.parsed_year ?? null
  const parts = [brand, model, year != null ? String(year) : ''].filter(Boolean)
  const vehicleLabel = parts.join(' ').trim() || 'Sin vehículo vinculado'
  return {
    inventoryId: row.inventory_vehicle_id ? String(row.inventory_vehicle_id) : null,
    vehicleLabel,
    brand: brand || '—',
    model: model || '—',
    year: year != null ? Number(year) : null,
  }
}

function aggregateVideoMetricsByVehicle(rows: VideoMetricsRowDb[]): {
  viewsTotal: number
  activeVideos: number
  retentionAvgPct: number | null
  vehicles: VehicleVideoViewsRow[]
} {
  const byKey = new Map<
    string,
    {
      inventoryId: string | null
      vehicleLabel: string
      brand: string
      model: string
      year: number | null
      views: number
      retSum: number
      retN: number
      videos: Set<string>
    }
  >()
  const allVideos = new Set<string>()
  let viewsTotal = 0
  let retSum = 0
  let retN = 0

  for (const row of rows) {
    const v = resolveVideoVehicle(row)
    const key = v.inventoryId ?? `__unlinked__${v.brand}|${v.model}|${v.year ?? ''}`
    const views = num(row.views)
    viewsTotal += views
    if (row.video_id) allVideos.add(String(row.video_id))

    const cur = byKey.get(key) ?? {
      inventoryId: v.inventoryId,
      vehicleLabel: v.vehicleLabel,
      brand: v.brand,
      model: v.model,
      year: v.year,
      views: 0,
      retSum: 0,
      retN: 0,
      videos: new Set<string>(),
    }
    cur.views += views
    if (row.video_id) cur.videos.add(String(row.video_id))
    const ret = retentionToDisplayPct(row.retention_rate)
    if (ret > 0) {
      cur.retSum += ret
      cur.retN += 1
      retSum += ret
      retN += 1
    }
    byKey.set(key, cur)
  }

  const vehicles: VehicleVideoViewsRow[] = [...byKey.values()]
    .map((v) => ({
      inventoryId: v.inventoryId,
      vehicleLabel: v.vehicleLabel,
      brand: v.brand,
      model: v.model,
      year: v.year,
      views: v.views,
      retentionAvgPct: v.retN > 0 ? v.retSum / v.retN : null,
      videoCount: v.videos.size,
    }))
    .sort((a, b) => b.views - a.views || b.videoCount - a.videoCount)

  return {
    viewsTotal,
    activeVideos: allVideos.size,
    retentionAvgPct: retN > 0 ? retSum / retN : null,
    vehicles,
  }
}

function reportDateStr(v: unknown): string {
  return String(v ?? '').slice(0, 10)
}

/** Fecha del snapshot: report_date (tablas diarias) o updated_at (meta_campaign_metrics acumulador). */
function metricSnapshotYmd(row: { report_date?: string | null; updated_at?: string | null }): string {
  if (row.report_date) return reportDateStr(row.report_date)
  if (row.updated_at) return reportDateStr(row.updated_at)
  return ''
}

/** Último snapshot por clave (campaña, vehículo+campaña, etc.). */
export function latestSnapshotByKey<
  T extends { report_date?: string | null; updated_at?: string | null },
>(
  rows: T[],
  keyFn: (row: T) => string
): T[] {
  const by = new Map<string, T>()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    const rd = metricSnapshotYmd(row)
    const existing = by.get(key)
    if (!existing || rd > metricSnapshotYmd(existing)) {
      by.set(key, row)
    }
  }
  return [...by.values()]
}

/** @deprecated alias — último snapshot por campaign_id */
export function latestSnapshotPerCampaign<
  T extends { campaign_id: string; report_date?: string | null; updated_at?: string | null },
>(rows: T[]): T[] {
  return latestSnapshotByKey(rows, (r) => String(r.campaign_id ?? ''))
}

type GeneralRowDb = {
  campaign_id: string
  campaign_name: string | null
  report_date: string | null
  spend: number
  leads_count: number
  reach: number
  impressions: number
  clicks: number
  cost_per_lead: number | null
  ads_count: number | null
}

type CampaignGeneralRowDb = {
  campaign_id: string
  campaign_name: string | null
  spend: number | null
  leads_count: number | null
  reach: number | null
  impressions: number | null
  clicks: number | null
  cost_per_lead: number | null
  updated_at?: string | null
  date_start: string | null
  date_stop: string | null
}

/** Campañas a nivel cuenta (inventory_id null) desde meta_campaign_metrics. */
async function loadGeneralCampaignMetricsInMonth(
  db: ReturnType<typeof metricsDb>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<{ rows: GeneralRowDb[]; usedFallbackSnapshot: boolean }> {
  const { data, error } = await db
    .from('meta_campaign_metrics')
    .select(
      'campaign_id, campaign_name, spend, leads_count, reach, impressions, clicks, cost_per_lead, updated_at, date_start, date_stop'
    )
    .limit(10000)
  if (error) throw error

  const latest = latestSnapshotPerCampaign((data ?? []) as CampaignGeneralRowDb[])

  const mapRow = (row: CampaignGeneralRowDb): GeneralRowDb => ({
    campaign_id: String(row.campaign_id ?? ''),
    campaign_name: row.campaign_name,
    report_date: metricSnapshotYmd(row) || null,
    spend: num(row.spend),
    leads_count: num(row.leads_count),
    reach: num(row.reach),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    cost_per_lead: row.cost_per_lead != null ? num(row.cost_per_lead) : null,
    ads_count: null,
  })

  let rows = latest
    .filter((row) =>
      campaignOverlapsMonth(row.date_start, row.date_stop, sinceReportDate, untilReportDate)
    )
    .map(mapRow)

  let usedFallbackSnapshot = false
  if (rows.length === 0 && latest.length > 0) {
    rows = latest.map(mapRow)
    usedFallbackSnapshot = true
  }

  return { rows, usedFallbackSnapshot }
}

type VehicleRowDb = {
  inventory_id: string
  vehicle_label: string | null
  campaign_id: string
  campaign_name: string | null
  report_date: string | null
  spend: number
  leads_count: number
  reach_sum: number
  impressions_sum: number
  clicks_sum: number
  cost_per_lead: number | null
  ads_count: number | null
}

type VehicleRowDbRaw = Omit<VehicleRowDb, 'vehicle_label' | 'report_date'> & {
  updated_at: string
}

/** Sin report_date en BD: una fila por (inventory_id, campaign_id), filtro por updated_at. */
const VEHICLE_SELECT =
  'inventory_id, campaign_id, campaign_name, spend, leads_count, reach_sum, impressions_sum, clicks_sum, cost_per_lead, ads_count, updated_at'

type InventoryMeta = { label: string; status: string | null }

async function fetchInventoryMeta(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[]
): Promise<Map<string, InventoryMeta>> {
  const unique = [...new Set(inventoryIds.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const { data, error } = await db
    .from('inventoryoracle')
    .select('id, brand, model, year, status')
    .in('id', unique)
  if (error) throw error

  const map = new Map<string, InventoryMeta>()
  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? '')
    const label = [(row as { brand?: string }).brand, (row as { model?: string }).model, (row as { year?: string | number }).year]
      .filter((x) => x != null && String(x).trim() !== '')
      .join(' ')
      .trim()
    if (!id) continue
    map.set(id, {
      label: label || 'Sin etiqueta',
      status: (row as { status?: string | null }).status ?? null,
    })
  }
  return map
}

async function fetchVehicleLabels(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[]
): Promise<Map<string, string>> {
  const meta = await fetchInventoryMeta(db, inventoryIds)
  const map = new Map<string, string>()
  for (const [id, m] of meta) map.set(id, m.label)
  return map
}

function mapVehicleRows(raw: VehicleRowDbRaw[], labels: Map<string, string>): VehicleRowDb[] {
  return raw.map((r) => ({
    inventory_id: r.inventory_id,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    spend: r.spend,
    leads_count: r.leads_count,
    reach_sum: num(r.reach_sum),
    impressions_sum: num(r.impressions_sum),
    clicks_sum: num(r.clicks_sum),
    cost_per_lead: r.cost_per_lead,
    ads_count: r.ads_count,
    vehicle_label: labels.get(String(r.inventory_id)) ?? null,
    report_date: reportDateStr(r.updated_at),
  }))
}

/** Gasto por inventario solo para campañas activas en el mes seleccionado. */
async function fetchSpendByInventoryForMonth(
  db: ReturnType<typeof metricsDb>,
  campaignWindows: Map<string, { dateStart: string | null; dateStop: string | null }>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<Map<string, number>> {
  const { data, error } = await db
    .from('meta_ad_vehicle_metrics')
    .select('inventory_id, campaign_id, spend')
    .limit(10000)
  if (error) throw error

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const id = String((row as { inventory_id?: string }).inventory_id ?? '')
    const cid = String((row as { campaign_id?: string }).campaign_id ?? '')
    if (!id || !cid) continue
    const w = campaignWindows.get(cid)
    if (
      w &&
      !campaignOverlapsMonth(w.dateStart, w.dateStop, sinceReportDate, untilReportDate)
    ) {
      continue
    }
    map.set(id, (map.get(id) ?? 0) + num((row as { spend?: unknown }).spend))
  }
  return map
}

/** Todas las filas vehículo+campaña (sin filtrar updated_at) para la tabla de leads. */
async function fetchAllVehicleMetricRows(db: ReturnType<typeof metricsDb>): Promise<VehicleRowDb[]> {
  const { data, error } = await db
    .from('meta_ad_vehicle_metrics')
    .select(VEHICLE_SELECT)
    .order('updated_at', { ascending: false })
    .limit(10000)
  if (error) throw error

  const raw = (data ?? []) as VehicleRowDbRaw[]
  const labels = await fetchVehicleLabels(db, raw.map((r) => String(r.inventory_id)))
  return mapVehicleRows(raw, labels)
}

async function loadVehicleMetricsInMonth(
  db: ReturnType<typeof metricsDb>,
  sinceIso: string,
  periodEndIso: string
): Promise<{ rows: VehicleRowDb[]; usedFallbackSnapshot: boolean }> {
  const { data, error } = await db
    .from('meta_ad_vehicle_metrics')
    .select(VEHICLE_SELECT)
    .gte('updated_at', sinceIso)
    .lte('updated_at', periodEndIso)
    .order('updated_at', { ascending: false })
    .limit(5000)
  if (error) throw error

  let raw = (data ?? []) as VehicleRowDbRaw[]
  let usedFallbackSnapshot = false
  if (raw.length === 0) {
    const { data: all, error: e2 } = await db
      .from('meta_ad_vehicle_metrics')
      .select(VEHICLE_SELECT)
      .lte('updated_at', periodEndIso)
      .order('updated_at', { ascending: false })
      .limit(5000)
    if (e2) throw e2
    raw = (all ?? []) as VehicleRowDbRaw[]
    usedFallbackSnapshot = raw.length > 0
  }

  const labels = await fetchVehicleLabels(db, raw.map((r) => String(r.inventory_id)))
  return { rows: mapVehicleRows(raw, labels), usedFallbackSnapshot }
}

function filterVehicleRowsByCampaignMonth(
  rows: VehicleRowDb[],
  campaignWindows: Map<string, { dateStart: string | null; dateStop: string | null }>,
  sinceReportDate: string,
  untilReportDate: string
): VehicleRowDb[] {
  return rows.filter((row) => {
    const w = campaignWindows.get(String(row.campaign_id ?? ''))
    if (!w) return true
    return campaignOverlapsMonth(w.dateStart, w.dateStop, sinceReportDate, untilReportDate)
  })
}

function buildAutoLabelsByCampaign(vehicleSnapshots: VehicleRowDb[]): Map<string, string> {
  const labelsByCampaign = new Map<string, Set<string>>()
  for (const row of vehicleSnapshots) {
    const cid = String(row.campaign_id ?? '')
    const label = String(row.vehicle_label ?? '').trim()
    if (!cid || !label) continue
    if (!labelsByCampaign.has(cid)) labelsByCampaign.set(cid, new Set())
    labelsByCampaign.get(cid)!.add(label)
  }
  const out = new Map<string, string>()
  for (const [cid, labels] of labelsByCampaign) {
    const arr = [...labels]
    if (arr.length === 0) out.set(cid, '—')
    else if (arr.length === 1) out.set(cid, arr[0])
    else out.set(cid, 'Varios')
  }
  return out
}

function buildCampaignRankFromGeneral(
  row: GeneralRowDb,
  autoLabels: Map<string, string>
): CampaignRankRow {
  const spend = num(row.spend)
  const leads = num(row.leads_count)
  const storedCpl = row.cost_per_lead != null ? num(row.cost_per_lead) : null
  const cid = row.campaign_id
  return {
    campaign_id: cid,
    campaign_name: String(row.campaign_name ?? cid).trim(),
    reportDate: row.report_date ? reportDateStr(row.report_date) : null,
    spend,
    leads,
    reach: 0,
    impressions: 0,
    clicks: 0,
    cpl: leads > 0 ? spend / leads : storedCpl,
    costPerLeadStored: storedCpl,
    dateStart: null,
    dateStop: null,
    autoLabel: autoLabels.get(cid) ?? '—',
    isGeneral: true,
    adsCount: row.ads_count != null ? num(row.ads_count) : null,
  }
}

function aggregateVehicleRowsToCampaign(
  rows: VehicleRowDb[],
  autoLabels: Map<string, string>
): CampaignRankRow {
  const first = rows[0]
  const cid = first.campaign_id
  let spend = 0
  let leads = 0
  let reach = 0
  let impressions = 0
  let clicks = 0
  let adsCount = 0
  let reportDate: string | null = null
  for (const r of rows) {
    spend += num(r.spend)
    leads += num(r.leads_count)
    reach += num(r.reach_sum)
    impressions += num(r.impressions_sum)
    clicks += num(r.clicks_sum)
    adsCount += num(r.ads_count)
    const rd = reportDateStr(r.report_date)
    if (!reportDate || rd > reportDate) reportDate = rd
  }
  const storedCpl = leads > 0 ? spend / leads : null
  return {
    campaign_id: cid,
    campaign_name: String(first.campaign_name ?? cid).trim(),
    reportDate,
    spend,
    leads,
    reach,
    impressions,
    clicks,
    cpl: storedCpl,
    costPerLeadStored: storedCpl,
    dateStart: null,
    dateStop: null,
    autoLabel: autoLabels.get(cid) ?? 'Varios',
    isGeneral: false,
    adsCount: adsCount || null,
  }
}

/** Fecha calendario en Ecuador (YYYY-MM-DD) para comparar sin desfases UTC. */
function toEcuadorYmd(isoOrDate: string | null | undefined): string | null {
  if (!isoOrDate) return null
  const d = new Date(isoOrDate)
  if (!Number.isFinite(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function compareYmd(a: string, b: string): number {
  return a.localeCompare(b)
}

function isYmdInRange(ymd: string, startYmd: string, endYmd: string): boolean {
  return compareYmd(ymd, startYmd) >= 0 && compareYmd(ymd, endYmd) <= 0
}

async function fetchCampaignWindows(
  db: ReturnType<typeof metricsDb>,
  campaignIds: string[]
): Promise<Map<string, { dateStart: string | null; dateStop: string | null }>> {
  const unique = [...new Set(campaignIds.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const { data, error } = await db
    .from('meta_campaign_metrics')
    .select('campaign_id, date_start, date_stop, updated_at')
    .in('campaign_id', unique)
    .limit(10000)
  if (error) throw error

  const latest = latestSnapshotPerCampaign((data ?? []) as CampaignWindowRow[])
  const out = new Map<string, { dateStart: string | null; dateStop: string | null }>()
  for (const row of latest) {
    const cid = String(row.campaign_id ?? '')
    if (!cid) continue
    out.set(cid, {
      dateStart: row.date_start ? String(row.date_start).slice(0, 10) : null,
      dateStop: row.date_stop ? String(row.date_stop).slice(0, 10) : null,
    })
  }
  return out
}

type LeadInterestPair = {
  leadId: number
  inventoryId: string
  leadCreatedAt: string
}

type CampanaLeadRef = {
  leadId: number
  inventoryId: string
  startYmd: string
  endYmd: string
}

type VehicleLeadCounts = {
  campanas: Map<string, number>
  organicos: Map<string, number>
  campanaLeads: CampanaLeadRef[]
}

type VehicleTemperatureCounts = {
  caliente: Map<string, number>
  tibio: Map<string, number>
  frio: Map<string, number>
}

const TEMP_RANK: Record<LeadTemperaturePeak, number> = {
  frio: 0,
  tibio: 1,
  caliente: 2,
}

function normalizeLeadTemperature(v: unknown): LeadTemperaturePeak | null {
  const s = String(v ?? '').toLowerCase()
  if (s === 'caliente' || s === 'tibio' || s === 'frio') return s
  return null
}

function maxLeadTemperature(a: LeadTemperaturePeak, b: LeadTemperaturePeak): LeadTemperaturePeak {
  return TEMP_RANK[b] > TEMP_RANK[a] ? b : a
}

/** Por vehículo: inicio = date_start más temprano; fin = date_stop más tardío (meta_campaign_metrics). */
function buildCampaignWindowByInventory(
  vehicleRows: VehicleRowDb[],
  campaignWindows: Map<string, { dateStart: string | null; dateStop: string | null }>
): Map<string, { startYmd: string; endYmd: string }> {
  const campaignsByInventory = new Map<string, Set<string>>()
  for (const row of vehicleRows) {
    const id = String(row.inventory_id ?? '')
    const cid = String(row.campaign_id ?? '')
    if (!id || !cid) continue
    if (!campaignsByInventory.has(id)) campaignsByInventory.set(id, new Set())
    campaignsByInventory.get(id)!.add(cid)
  }

  const todayYmd = getEcuadorTodayYmd()
  const out = new Map<string, { startYmd: string; endYmd: string }>()
  for (const [invId, campaignIds] of campaignsByInventory) {
    let startYmd: string | null = null
    let endYmd: string | null = null
    for (const cid of campaignIds) {
      const w = campaignWindows.get(cid)
      if (!w?.dateStart) continue
      const ds = w.dateStart.slice(0, 10)
      const de = (w.dateStop ?? todayYmd).slice(0, 10)
      if (!startYmd || compareYmd(ds, startYmd) < 0) startYmd = ds
      if (!endYmd || compareYmd(de, endYmd) > 0) endYmd = de
    }
    if (!startYmd || !endYmd) continue
    out.set(invId, { startYmd, endYmd })
  }
  return out
}

function resolveInventoryId(
  row: { inventory_id?: string | null; vehicle_uid?: string | null },
  inventoryIds: Set<string>
): string | null {
  if (row.inventory_id && inventoryIds.has(String(row.inventory_id))) {
    return String(row.inventory_id)
  }
  if (row.vehicle_uid && inventoryIds.has(String(row.vehicle_uid))) {
    return String(row.vehicle_uid)
  }
  return null
}

/** Misma base que VehicleStatsView: paginar leads y expandir interested_cars. */
async function fetchLeadInterestPairsForInventories(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[],
  queryStartYmd: string,
  queryEndYmd: string
): Promise<LeadInterestPair[]> {
  if (inventoryIds.length === 0) return []

  const queryStartIso = `${queryStartYmd}T00:00:00.000-05:00`
  const queryEndIso = `${queryEndYmd}T23:59:59.999-05:00`
  const inventoryIdSet = new Set(inventoryIds)
  const PAGE_SIZE = 1000
  const pairs: LeadInterestPair[] = []

  let page = 0
  let hasMore = true
  while (hasMore && page < 30) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await db
      .from('leads')
      .select('id, created_at, interested_cars(inventory_id, vehicle_uid)')
      .gte('created_at', queryStartIso)
      .lte('created_at', queryEndIso)
      .order('id', { ascending: true })
      .range(from, to)
    if (error) throw error

    const batch = data ?? []
    if (batch.length < PAGE_SIZE) hasMore = false
    page++

    for (const lead of batch) {
      const leadId = Number((lead as { id?: number }).id)
      const leadCreatedAt = String((lead as { created_at?: string }).created_at ?? '')
      if (!leadId || !leadCreatedAt) continue
      const rawIc = (lead as { interested_cars?: unknown }).interested_cars
      const cars = Array.isArray(rawIc) ? rawIc : rawIc ? [rawIc] : []
      for (const c of cars) {
        const invId = resolveInventoryId(
          c as { inventory_id?: string | null; vehicle_uid?: string | null },
          inventoryIdSet
        )
        if (!invId) continue
        pairs.push({ leadId, inventoryId: invId, leadCreatedAt })
      }
    }
  }

  return pairs
}

/**
 * leads.created_at en Ecuador (igual criterio que admin / VehicleStatsView):
 * - [date_start, date_stop] → leads campañas
 * - Antes del inicio o después del fin, solo en el mes seleccionado → orgánico
 */
async function countVehicleLeadsFromInterestedCars(
  db: ReturnType<typeof metricsDb>,
  vehicleRows: VehicleRowDb[],
  campaignWindows: Map<string, { dateStart: string | null; dateStop: string | null }>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<VehicleLeadCounts> {
  const inventoryIds = [...new Set(vehicleRows.map((r) => String(r.inventory_id)).filter(Boolean))]
  const campanas = new Map<string, number>()
  const organicos = new Map<string, number>()
  const campanaLeadByKey = new Map<string, CampanaLeadRef>()
  for (const id of inventoryIds) {
    campanas.set(id, 0)
    organicos.set(id, 0)
  }
  if (inventoryIds.length === 0) return { campanas, organicos, campanaLeads: [] }

  const windowByInventory = buildCampaignWindowByInventory(vehicleRows, campaignWindows)
  if (windowByInventory.size === 0) return { campanas, organicos, campanaLeads: [] }

  const todayYmd = getEcuadorTodayYmd()
  const monthStartYmd = sinceReportDate.slice(0, 10)
  const monthEndYmd =
    compareYmd(untilReportDate, todayYmd) > 0 ? todayYmd : untilReportDate.slice(0, 10)

  let queryEndYmd = monthEndYmd
  for (const w of windowByInventory.values()) {
    if (compareYmd(w.endYmd, queryEndYmd) > 0) queryEndYmd = w.endYmd
  }

  const leadInterestRows = await fetchLeadInterestPairsForInventories(
    db,
    inventoryIds,
    monthStartYmd,
    queryEndYmd
  )

  for (const row of leadInterestRows) {
    const invId = row.inventoryId
    const createdYmd = toEcuadorYmd(row.leadCreatedAt)
    if (!createdYmd) continue

    const win = windowByInventory.get(invId)
    if (!win) continue

    const inCampaignWindow = isYmdInRange(createdYmd, win.startYmd, win.endYmd)
    const inSelectedMonth = isYmdInRange(createdYmd, monthStartYmd, monthEndYmd)

    if (inCampaignWindow) {
      campanas.set(invId, (campanas.get(invId) ?? 0) + 1)
      const refKey = `${row.leadId}|${invId}`
      if (!campanaLeadByKey.has(refKey)) {
        campanaLeadByKey.set(refKey, {
          leadId: row.leadId,
          inventoryId: invId,
          startYmd: win.startYmd,
          endYmd: win.endYmd,
        })
      }
      continue
    }

    if (!inSelectedMonth) continue

    if (compareYmd(createdYmd, win.startYmd) < 0 || compareYmd(createdYmd, win.endYmd) > 0) {
      organicos.set(invId, (organicos.get(invId) ?? 0) + 1)
    }
  }

  return { campanas, organicos, campanaLeads: [...campanaLeadByKey.values()] }
}

/** Pico de temperatura por lead+auto en ventana de campaña (lead_temperature_daily → fallback leads.temperature). */
async function countVehicleLeadTemperatures(
  db: ReturnType<typeof metricsDb>,
  campanaLeads: CampanaLeadRef[]
): Promise<VehicleTemperatureCounts> {
  const caliente = new Map<string, number>()
  const tibio = new Map<string, number>()
  const frio = new Map<string, number>()

  if (campanaLeads.length === 0) {
    return { caliente, tibio, frio }
  }

  let minYmd = campanaLeads[0].startYmd
  let maxYmd = campanaLeads[0].endYmd
  const leadIds = new Set<number>()
  for (const ref of campanaLeads) {
    leadIds.add(ref.leadId)
    if (compareYmd(ref.startYmd, minYmd) < 0) minYmd = ref.startYmd
    if (compareYmd(ref.endYmd, maxYmd) > 0) maxYmd = ref.endYmd
  }

  const refsByLeadId = new Map<number, CampanaLeadRef[]>()
  for (const ref of campanaLeads) {
    const list = refsByLeadId.get(ref.leadId) ?? []
    list.push(ref)
    refsByLeadId.set(ref.leadId, list)
  }

  const peakByKey = new Map<string, LeadTemperaturePeak>()
  const leadIdList = [...leadIds]
  const CHUNK = 200

  for (let i = 0; i < leadIdList.length; i += CHUNK) {
    const chunk = leadIdList.slice(i, i + CHUNK)
    const { data, error } = await db
      .from('lead_temperature_daily')
      .select('lead_id, activity_date, temperature_peak')
      .in('lead_id', chunk)
      .gte('activity_date', minYmd)
      .lte('activity_date', maxYmd)
      .limit(10000)
    if (error) throw error

    for (const row of data ?? []) {
      const leadId = Number((row as { lead_id?: number }).lead_id)
      const activityDate = String((row as { activity_date?: string }).activity_date ?? '').slice(0, 10)
      const peak = normalizeLeadTemperature((row as { temperature_peak?: string }).temperature_peak)
      if (!leadId || !activityDate || !peak) continue

      for (const ref of refsByLeadId.get(leadId) ?? []) {
        if (!isYmdInRange(activityDate, ref.startYmd, ref.endYmd)) continue
        const key = `${leadId}|${ref.inventoryId}`
        const prev = peakByKey.get(key)
        peakByKey.set(key, prev ? maxLeadTemperature(prev, peak) : peak)
      }
    }
  }

  const leadTempFallback = new Map<number, LeadTemperaturePeak>()
  for (let i = 0; i < leadIdList.length; i += CHUNK) {
    const chunk = leadIdList.slice(i, i + CHUNK)
    const needsFallback = chunk.filter((id) =>
      (refsByLeadId.get(id) ?? []).some((ref) => !peakByKey.has(`${id}|${ref.inventoryId}`))
    )
    if (needsFallback.length === 0) continue
    const { data, error } = await db.from('leads').select('id, temperature').in('id', needsFallback)
    if (error) throw error
    for (const row of data ?? []) {
      const leadId = Number((row as { id?: number }).id)
      leadTempFallback.set(
        leadId,
        normalizeLeadTemperature((row as { temperature?: string }).temperature) ?? 'frio'
      )
    }
  }

  for (const ref of campanaLeads) {
    const key = `${ref.leadId}|${ref.inventoryId}`
    if (!peakByKey.has(key)) {
      peakByKey.set(key, leadTempFallback.get(ref.leadId) ?? 'frio')
    }
  }

  const bump = (map: Map<string, number>, invId: string) => map.set(invId, (map.get(invId) ?? 0) + 1)

  for (const [key, peak] of peakByKey) {
    const invId = key.split('|')[1]
    if (!invId) continue
    if (peak === 'caliente') bump(caliente, invId)
    else if (peak === 'tibio') bump(tibio, invId)
    else bump(frio, invId)
  }

  return { caliente, tibio, frio }
}

/** Visitas showroom por vehículo — alineado a /showroom (visit_start) y ventana de campaña de la tabla. */
async function countShowroomVisitsByInventory(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[],
  windowByInventory: Map<string, { startYmd: string; endYmd: string }>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const id of inventoryIds) counts.set(id, 0)
  if (inventoryIds.length === 0) return counts

  const inventoryIdSet = new Set(inventoryIds)
  const todayYmd = getEcuadorTodayYmd()
  const monthEndYmd =
    compareYmd(untilReportDate, todayYmd) > 0 ? todayYmd : untilReportDate.slice(0, 10)
  const queryStartIso = `${sinceReportDate}T00:00:00.000-05:00`
  const queryEndIso = `${monthEndYmd}T23:59:59.999-05:00`

  const PAGE_SIZE = 1000
  let page = 0
  let hasMore = true
  while (hasMore && page < 30) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await db
      .from('showroom_visits')
      .select('inventoryoracle_id, inventory_id, visit_start')
      .gte('visit_start', queryStartIso)
      .lte('visit_start', queryEndIso)
      .order('id', { ascending: true })
      .range(from, to)
    if (error) throw error

    const batch = data ?? []
    if (batch.length < PAGE_SIZE) hasMore = false
    page++

    for (const row of batch) {
      const invOracle = (row as { inventoryoracle_id?: string | null }).inventoryoracle_id
      const invLegacy = (row as { inventory_id?: string | null }).inventory_id
      let invId: string | null = null
      if (invOracle && inventoryIdSet.has(String(invOracle))) invId = String(invOracle)
      else if (invLegacy && inventoryIdSet.has(String(invLegacy))) invId = String(invLegacy)
      if (!invId) continue

      const visitYmd = toEcuadorYmd(String((row as { visit_start?: string }).visit_start ?? ''))
      if (!visitYmd) continue

      const win = windowByInventory.get(invId)
      const inCampaignWindow = win
        ? isYmdInRange(visitYmd, win.startYmd, win.endYmd)
        : isYmdInRange(visitYmd, sinceReportDate.slice(0, 10), monthEndYmd)

      if (!inCampaignWindow) continue
      counts.set(invId, (counts.get(invId) ?? 0) + 1)
    }
  }

  return counts
}

/** Citas IA: lead con detección bot + leads.created_at en ventana de campaña (como leads campañas). */
async function countBotSuggestionsByInventory(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[],
  windowByInventory: Map<string, { startYmd: string; endYmd: string }>,
  sinceReportDate: string,
  untilReportDate: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const id of inventoryIds) counts.set(id, 0)
  if (inventoryIds.length === 0 || windowByInventory.size === 0) return counts

  const inventoryIdSet = new Set(inventoryIds)
  const todayYmd = getEcuadorTodayYmd()
  const monthStartYmd = sinceReportDate.slice(0, 10)
  const monthEndYmd =
    compareYmd(untilReportDate, todayYmd) > 0 ? todayYmd : untilReportDate.slice(0, 10)

  let queryEndYmd = monthEndYmd
  for (const w of windowByInventory.values()) {
    if (compareYmd(w.endYmd, queryEndYmd) > 0) queryEndYmd = w.endYmd
  }
  const queryStartIso = `${monthStartYmd}T00:00:00.000-05:00`
  const queryEndIso = `${queryEndYmd}T23:59:59.999-05:00`

  const activeLeadIds = new Set<number>()
  {
    const PAGE = 500
    let page = 0
    let more = true
    while (more && page < 40) {
      const from = page * PAGE
      const to = from + PAGE - 1
      const { data, error } = await db
        .from('appointments')
        .select('lead_id, status, start_time, is_completed')
        .not('lead_id', 'is', null)
        .order('id', { ascending: true })
        .range(from, to)
      if (error) throw error
      const batch = data ?? []
      if (batch.length < PAGE) more = false
      page++
      for (const row of batch) {
        const leadId = (row as { lead_id?: number | null }).lead_id
        if (leadId == null) continue
        if (
          isAppointmentPendingActive(
            row as { status?: string | null; start_time: string; is_completed?: boolean | null }
          )
        ) {
          activeLeadIds.add(leadId)
        }
      }
    }
  }

  const PAGE_SIZE = 500
  let page = 0
  let hasMore = true
  while (hasMore && page < 40) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await db
      .from('leads')
      .select('id, time_reference, day_detected, hour_detected, created_at, interested_cars(inventory_id, vehicle_uid)')
      .or('time_reference.not.is.null,day_detected.not.is.null,hour_detected.not.is.null')
      .gte('created_at', queryStartIso)
      .lte('created_at', queryEndIso)
      .order('id', { ascending: true })
      .range(from, to)
    if (error) throw error

    const batch = data ?? []
    if (batch.length < PAGE_SIZE) hasMore = false
    page++

    for (const row of batch) {
      const leadId = (row as { id?: number }).id
      if (leadId == null || activeLeadIds.has(leadId)) continue
      if (!isBotSuggestionVisible(row as Parameters<typeof isBotSuggestionVisible>[0])) continue

      const createdYmd = toEcuadorYmd(String((row as { created_at?: string }).created_at ?? ''))
      if (!createdYmd) continue

      const rawIc = (row as { interested_cars?: unknown }).interested_cars
      const cars = Array.isArray(rawIc) ? rawIc : rawIc ? [rawIc] : []
      const matched = new Set<string>()
      for (const c of cars) {
        const invId = resolveInventoryId(
          c as { inventory_id?: string | null; vehicle_uid?: string | null },
          inventoryIdSet
        )
        if (!invId || matched.has(invId)) continue

        const win = windowByInventory.get(invId)
        if (!win) continue
        if (!isYmdInRange(createdYmd, win.startYmd, win.endYmd)) continue
        matched.add(invId)
        counts.set(invId, (counts.get(invId) ?? 0) + 1)
      }
    }
  }

  return counts
}

function buildVehicleLeadsTable(
  vehicleSnapshots: VehicleRowDb[],
  leadCounts: VehicleLeadCounts,
  spendByInventory: Map<string, number>,
  tempCounts: VehicleTemperatureCounts,
  inventoryMeta: Map<string, InventoryMeta>,
  showroomByInventory: Map<string, number>,
  botSuggestionsByInventory: Map<string, number>
): VehicleLeadsRow[] {
  const byInventory = new Map<
    string,
    {
      campaignIds: Set<string>
      reachSum: number
      impressionsSum: number
      clicksSum: number
    }
  >()
  for (const row of vehicleSnapshots) {
    const id = String(row.inventory_id ?? '')
    if (!id) continue
    const cur = byInventory.get(id) ?? {
      campaignIds: new Set<string>(),
      reachSum: 0,
      impressionsSum: 0,
      clicksSum: 0,
    }
    cur.campaignIds.add(row.campaign_id)
    cur.reachSum += num(row.reach_sum)
    cur.impressionsSum += num(row.impressions_sum)
    cur.clicksSum += num(row.clicks_sum)
    byInventory.set(id, cur)
  }

  // Incluir autos con gasto en Meta aunque no tengan fila reciente en snapshots (ej. ya vendidos).
  for (const [inventoryId, spend] of spendByInventory) {
    if (spend > 0 && !byInventory.has(inventoryId)) {
      byInventory.set(inventoryId, {
        campaignIds: new Set(),
        reachSum: 0,
        impressionsSum: 0,
        clicksSum: 0,
      })
    }
  }

  const result: VehicleLeadsRow[] = []
  for (const [inventoryId, { campaignIds, reachSum, impressionsSum, clicksSum }] of byInventory) {
    const meta = inventoryMeta.get(inventoryId)
    const status = meta?.status ?? null
    const isVendido = String(status ?? '').toLowerCase() === 'vendido'
    const leadsCampanas = leadCounts.campanas.get(inventoryId) ?? 0
    const leadsOrganicos = leadCounts.organicos.get(inventoryId) ?? 0
    const spendCampanas = spendByInventory.get(inventoryId) ?? 0
    result.push({
      inventoryId,
      vehicleLabel: meta?.label ?? 'Sin etiqueta',
      leadsCampanas,
      leadsOrganicos,
      leadsTotal: leadsCampanas + leadsOrganicos,
      spendCampanas,
      cplReal: leadsCampanas > 0 ? spendCampanas / leadsCampanas : null,
      campaignCount: campaignIds.size,
      reachSum,
      impressionsSum,
      clicksSum,
      leadsCaliente: tempCounts.caliente.get(inventoryId) ?? 0,
      leadsTibio: tempCounts.tibio.get(inventoryId) ?? 0,
      leadsFrio: tempCounts.frio.get(inventoryId) ?? 0,
      inventoryStatus: status,
      isVendido,
      showroomVisitas: showroomByInventory.get(inventoryId) ?? 0,
      citasIa: botSuggestionsByInventory.get(inventoryId) ?? 0,
    })
  }

  return result.sort((a, b) => {
    if (a.isVendido !== b.isVendido) return a.isVendido ? 1 : -1
    return (
      b.leadsTotal - a.leadsTotal ||
      b.spendCampanas - a.spendCampanas ||
      b.leadsCampanas - a.leadsCampanas
    )
  })
}

async function fetchDisponiblePatioInventoryIds(
  db: ReturnType<typeof metricsDb>,
  excludeIds: Set<string>
): Promise<string[]> {
  const { data, error } = await db
    .from('inventoryoracle')
    .select('id')
    .eq('location', 'patio')
    .eq('status', 'disponible')
  if (error) throw error
  return (data ?? [])
    .map((r: { id?: string }) => String(r.id ?? ''))
    .filter((id: string) => id && !excludeIds.has(id))
}

/** Leads únicos por auto en el mes (sin ventana de campaña). */
async function countVehicleLeadsInMonthOnly(
  db: ReturnType<typeof metricsDb>,
  inventoryIds: string[],
  sinceReportDate: string,
  untilReportDate: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const id of inventoryIds) counts.set(id, 0)
  if (inventoryIds.length === 0) return counts

  const todayYmd = getEcuadorTodayYmd()
  const monthStartYmd = sinceReportDate.slice(0, 10)
  const monthEndYmd =
    compareYmd(untilReportDate, todayYmd) > 0 ? todayYmd : untilReportDate.slice(0, 10)

  const pairs = await fetchLeadInterestPairsForInventories(
    db,
    inventoryIds,
    monthStartYmd,
    monthEndYmd
  )

  const uniqueByInv = new Map<string, Set<number>>()
  for (const row of pairs) {
    const createdYmd = toEcuadorYmd(row.leadCreatedAt)
    if (!createdYmd || !isYmdInRange(createdYmd, monthStartYmd, monthEndYmd)) continue
    if (!uniqueByInv.has(row.inventoryId)) uniqueByInv.set(row.inventoryId, new Set())
    uniqueByInv.get(row.inventoryId)!.add(row.leadId)
  }
  for (const [invId, set] of uniqueByInv) counts.set(invId, set.size)
  return counts
}

function buildNeutralInventoryVehicleRows(
  neutralIds: string[],
  leadsInMonth: Map<string, number>,
  inventoryMeta: Map<string, InventoryMeta>,
  showroomByInventory: Map<string, number>
): VehicleLeadsRow[] {
  const result: VehicleLeadsRow[] = []
  for (const inventoryId of neutralIds) {
    const meta = inventoryMeta.get(inventoryId)
    const org = leadsInMonth.get(inventoryId) ?? 0
    result.push({
      inventoryId,
      vehicleLabel: meta?.label ?? 'Sin etiqueta',
      leadsCampanas: 0,
      leadsOrganicos: org,
      leadsTotal: org,
      spendCampanas: 0,
      cplReal: null,
      campaignCount: 0,
      reachSum: 0,
      impressionsSum: 0,
      clicksSum: 0,
      leadsCaliente: 0,
      leadsTibio: 0,
      leadsFrio: 0,
      inventoryStatus: meta?.status ?? 'disponible',
      isVendido: false,
      showroomVisitas: showroomByInventory.get(inventoryId) ?? 0,
      citasIa: 0,
    })
  }
  return result.sort(
    (a, b) => b.leadsTotal - a.leadsTotal || a.vehicleLabel.localeCompare(b.vehicleLabel, 'es')
  )
}

export async function fetchDashboardMetrics(
  supabase: SupabaseClient,
  campaignMonth: MetricasCampaignMonth
): Promise<DashboardMetrics> {
  const db = metricsDb(supabase)
  const { sinceIso, periodEndIso, sinceReportDate, untilReportDate, monthLabel } =
    campaignMonthRange(campaignMonth)

  const [
    { data: interestRows, error: ie },
    { rows: generalRaw, usedFallbackSnapshot: usedFallbackGeneral },
    { rows: vehicleRaw, usedFallbackSnapshot: usedFallbackVehicle },
    { data: videoRows, error: ve },
    { data: reports, error: re },
    { reachTotal, impressionsTotal: campaignImpressionsTotal, clicksTotal: campaignClicksTotal, byCampaignId },
  ] = await Promise.all([
    db
      .from('interested_cars')
      .select('id, vehicle_uid, inventory_id, created_at')
      .gte('created_at', sinceIso)
      .lte('created_at', periodEndIso)
      .limit(10000),
    loadGeneralCampaignMetricsInMonth(db, sinceReportDate, untilReportDate),
    loadVehicleMetricsInMonth(db, sinceIso, periodEndIso),
    db
      .from('meta_video_metrics')
      .select(
        'video_id, views, retention_rate, fetched_at, inventory_vehicle_id, parsed_brand, parsed_model, parsed_year, inventoryoracle(brand, model, year)'
      )
      .gte('fetched_at', sinceIso)
      .lte('fetched_at', periodEndIso)
      .limit(5000),
    db
      .from('daily_metrics_report')
      .select('*')
      .gte('report_date', sinceReportDate)
      .lte('report_date', untilReportDate)
      .order('report_date', { ascending: false })
      .limit(31),
    fetchPaidCampaignLevelMetrics(db, sinceReportDate, untilReportDate),
  ])

  if (ie) throw ie
  if (ve) throw ve
  if (re) throw re

  const usedFallbackSnapshot = usedFallbackGeneral || usedFallbackVehicle

  const generalSnapshots = latestSnapshotPerCampaign(generalRaw)
  const vehicleSnapshots = latestSnapshotByKey(
    vehicleRaw,
    (r) => `${r.inventory_id}|${r.campaign_id}`
  )
  const allVehicleRows = await fetchAllVehicleMetricRows(db)
  const campaignIdsForWindows = [
    ...new Set([
      ...allVehicleRows.map((r) => String(r.campaign_id)),
      ...vehicleSnapshots.map((r) => String(r.campaign_id)),
      ...generalSnapshots.map((r) => String(r.campaign_id)),
    ].filter(Boolean)),
  ]
  const campaignWindows = await fetchCampaignWindows(db, campaignIdsForWindows)

  const vehicleRowsInMonth = filterVehicleRowsByCampaignMonth(
    allVehicleRows,
    campaignWindows,
    sinceReportDate,
    untilReportDate
  )
  const vehicleSnapshotsInMonth = filterVehicleRowsByCampaignMonth(
    vehicleSnapshots,
    campaignWindows,
    sinceReportDate,
    untilReportDate
  )
  const autoLabels = buildAutoLabelsByCampaign(vehicleSnapshotsInMonth)

  const spendByInventory = await fetchSpendByInventoryForMonth(
    db,
    campaignWindows,
    sinceReportDate,
    untilReportDate
  )
  const leadCounts = await countVehicleLeadsFromInterestedCars(
    db,
    vehicleRowsInMonth,
    campaignWindows,
    sinceReportDate,
    untilReportDate
  )
  const tempCounts = await countVehicleLeadTemperatures(db, leadCounts.campanaLeads)
  const tableInventoryIds = [
    ...new Set([
      ...vehicleRowsInMonth.map((r) => String(r.inventory_id)).filter(Boolean),
      ...[...spendByInventory.keys()].filter((id) => (spendByInventory.get(id) ?? 0) > 0),
    ]),
  ]
  const inventoryMeta = await fetchInventoryMeta(db, tableInventoryIds)
  const windowByInventory = buildCampaignWindowByInventory(vehicleRowsInMonth, campaignWindows)
  const showroomByInventory = await countShowroomVisitsByInventory(
    db,
    tableInventoryIds,
    windowByInventory,
    sinceReportDate,
    untilReportDate
  )
  const botSuggestionsByInventory = await countBotSuggestionsByInventory(
    db,
    tableInventoryIds,
    windowByInventory,
    sinceReportDate,
    untilReportDate
  )
  const byVehicle = buildVehicleLeadsTable(
    vehicleRowsInMonth,
    leadCounts,
    spendByInventory,
    tempCounts,
    inventoryMeta,
    showroomByInventory,
    botSuggestionsByInventory
  )

  const campaignInventoryIds = new Set(byVehicle.map((r) => r.inventoryId))
  const neutralIds = await fetchDisponiblePatioInventoryIds(db, campaignInventoryIds)
  const [neutralMeta, neutralLeadsInMonth, neutralShowroom] = await Promise.all([
    fetchInventoryMeta(db, neutralIds),
    countVehicleLeadsInMonthOnly(db, neutralIds, sinceReportDate, untilReportDate),
    countShowroomVisitsByInventory(
      db,
      neutralIds,
      new Map(),
      sinceReportDate,
      untilReportDate
    ),
  ])
  const byVehicleNeutral = buildNeutralInventoryVehicleRows(
    neutralIds,
    neutralLeadsInMonth,
    neutralMeta,
    neutralShowroom
  )

  const generalCampaignIds = new Set(generalSnapshots.map((r) => r.campaign_id))

  const campaignRowsFromGeneral: CampaignRankRow[] = generalSnapshots.map((r) =>
    buildCampaignRankFromGeneral(r, autoLabels)
  )

  const vehicleOnlyByCampaign = new Map<string, VehicleRowDb[]>()
  for (const row of vehicleSnapshotsInMonth) {
    if (generalCampaignIds.has(row.campaign_id)) continue
    const list = vehicleOnlyByCampaign.get(row.campaign_id) ?? []
    list.push(row)
    vehicleOnlyByCampaign.set(row.campaign_id, list)
  }
  const campaignRowsVehicleOnly: CampaignRankRow[] = [...vehicleOnlyByCampaign.values()].map(
    (rows) => aggregateVehicleRowsToCampaign(rows, autoLabels)
  )

  const allCampaigns = [...campaignRowsFromGeneral, ...campaignRowsVehicleOnly]
    .map((c) => {
      const level = byCampaignId.get(c.campaign_id)
      if (c.isGeneral) {
        return {
          ...c,
          reach: level?.reach ?? 0,
          impressions: level?.impressions ?? 0,
          clicks: level?.clicks ?? 0,
        }
      }
      return c
    })
    .sort((a, b) => b.leads - a.leads || b.spend - a.spend)

  const snapshotDatesUsed = [
    ...new Set(
      [...generalSnapshots, ...vehicleSnapshotsInMonth]
        .map((r) => reportDateStr(r.report_date))
        .filter(Boolean)
    ),
  ].sort()
  const latestSnapshotDate =
    snapshotDatesUsed.length > 0 ? snapshotDatesUsed[snapshotDatesUsed.length - 1] : null

  // Inversión y contactos (ads) a nivel campaña: solo meta_campaign_metrics (sin sumar meta_ad_vehicle_metrics).
  let spendTotal = 0
  let leadsFromAds = 0
  for (const row of generalSnapshots) {
    spendTotal += num(row.spend)
    leadsFromAds += num(row.leads_count)
  }

  const impressionsTotal = campaignImpressionsTotal
  const clicksTotal = campaignClicksTotal

  const campaignsWithSpend = allCampaigns.filter((c) => c.spend > 0).length
  const cplFromAds = leadsFromAds > 0 ? spendTotal / leadsFromAds : null

  const topCampaigns = allCampaigns
    .filter((c) => c.leads > 0 || c.spend > 0)
    .slice(0, 10)

  const leadsOrganico = (interestRows ?? []).length
  const contactsTotal = leadsOrganico + leadsFromAds
  const withoutCampaign = Math.max(0, leadsOrganico)

  const reportList = (reports ?? []) as DailyMetricsReportRow[]
  const latestReport = reportList[0] ?? null

  let autosSinContactos = 0
  if (latestReport) {
    autosSinContactos = num(latestReport.autos_sin_leads)
  } else {
    const inv = await fetchInventoryWithMetrics(supabase, 30)
    autosSinContactos = inv.rows.filter((r) => r.leads_window === 0).length
  }

  const estimatedCpl =
    cplFromAds ??
    (latestReport && num(latestReport.costo_por_lead) > 0
      ? num(latestReport.costo_por_lead)
      : null)

  let trendVsPrior: number | null = null
  if (reportList.length >= 2) {
    trendVsPrior = num(reportList[0].leads_total) - num(reportList[reportList.length - 1].leads_total)
  }

  const videoAgg = aggregateVideoMetricsByVehicle((videoRows ?? []) as VideoMetricsRowDb[])
  const bestVehicle = videoAgg.vehicles[0]

  let excerpt: string | null = null
  if (latestReport?.resumen_ejecutivo) {
    const parts = String(latestReport.resumen_ejecutivo)
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
    excerpt = parts[0] ?? null
  }

  const ctrPct = impressionsTotal > 0 ? (clicksTotal / impressionsTotal) * 100 : null

  return {
    campaignMonth,
    monthLabel,
    sinceIso,
    sinceReportDate,
    untilReportDate,
    contacts: {
      total: contactsTotal,
      organico: leadsOrganico,
      withActiveCampaign: leadsFromAds,
      withoutCampaign,
      autosSinContactos,
      estimatedCpl,
      trendVsPrior,
    },
    paid: {
      spendTotal,
      contactsFromAds: leadsFromAds,
      cplReal: cplFromAds,
      reachTotal,
      impressionsTotal,
      clicksTotal,
      ctrPct,
      activeCampaigns: allCampaigns.length,
      campaignsWithSpend,
      vehiclesWithAds: byVehicle.length,
      generalCampaignsCount: generalSnapshots.length,
      snapshotDatesUsed,
      latestSnapshotDate,
      usedFallbackSnapshot,
      topCampaigns,
      allCampaigns,
      byVehicle,
      byVehicleNeutral,
    },
    organic: {
      viewsTotal: videoAgg.viewsTotal,
      activeVideos: videoAgg.activeVideos,
      retentionAvgPct: videoAgg.retentionAvgPct,
      bestVehicle: bestVehicle?.vehicleLabel ?? null,
      bestVehicleViews: bestVehicle?.views ?? 0,
      vehicles: videoAgg.vehicles,
    },
    narrative: {
      reportDate: latestReport?.report_date ?? null,
      excerpt,
    },
  }
}
