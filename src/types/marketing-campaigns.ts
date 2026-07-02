export type CampaignGroupStatus = 'draft' | 'active' | 'completed'
export type CampaignVideoStatus = 'pending' | 'done' | 'needs_another'
export type CampaignSegment = 'suv' | 'sedan' | 'camioneta'

export type CampaignCreator = {
  id: string
  full_name: string
  role: string | null
}

export type CampaignVehicleRow = {
  id: string
  group_id: string
  inventory_id: string
  sort_order: number
  notes: string | null
  video_status: CampaignVideoStatus
  price_snapshot: number | null
  brand: string
  model: string
  year: number
  type_body: string | null
  img_main_url: string | null
  plate: string | null
  display_price: number | null
  reelsCount: number
  postsCount: number
  needsVideo: boolean
  needsPhotos: boolean
  segment: CampaignSegment | null
}

export type CampaignGroupRow = {
  id: string
  name: string
  vehicle_category: string | null
  segment: CampaignSegment | null
  campaign_month: string
  status: CampaignGroupStatus
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  creator: CampaignCreator | null
  vehicles: CampaignVehicleRow[]
  needsVideoVehicles: string[]
  needsPhotosVehicles: string[]
}

export type AvailableVehicleRow = {
  id: string
  brand: string
  model: string
  year: number
  type_body: string | null
  status: string | null
  img_main_url: string | null
  plate: string | null
  display_price: number | null
  segment: CampaignSegment | null
}

export type CampaignSegmentStats = {
  groups: number
  activeGroups: number
  assignedVehicles: number
  availableCount: number
  missingVideo: number
}

export type CampaignDashboardPayload = {
  campaignMonth: string
  groups: CampaignGroupRow[]
  availableVehicles: AvailableVehicleRow[]
  segmentStats: Record<CampaignSegment, CampaignSegmentStats>
  stats: {
    totalGroups: number
    activeGroups: number
    assignedVehicles: number
    availableCount: number
    missingVideo: number
  }
  /** Total en inventoryoracle (no vendidos), antes de asignar a campañas */
  totalInventory?: number
  tablesReady?: boolean
  groupsError?: string
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignGroupStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  completed: 'Completada',
}

export const VIDEO_STATUS_LABELS: Record<CampaignVideoStatus, string> = {
  pending: 'Falta video',
  done: 'Video listo',
  needs_another: 'Otro video',
}

export function formatCampaignMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function currentCampaignMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatVehiclePrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(price)
}

export function vehicleTitle(brand: string, model: string, year: number): string {
  const tc = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  return `${tc(brand)} ${tc(model)} ${year}`
}
