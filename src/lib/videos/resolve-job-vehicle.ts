import { isPipelineInputMeta } from './clip-config'

import type { InventoryVehicleSnippet } from './raw-clips-types'

export type { InventoryVehicleSnippet } from './raw-clips-types'

export type ResolvedJobVehicle = {
  vehicleId: string | null
  title: string
  subtitle: string | null
  inventory: InventoryVehicleSnippet | null
}

type JobVehicleFields = {
  id: string
  job_name: string | null
  vehicle_line_1?: string | null
  vehicle_line_2: string | null
  vehicle_line_4?: string | null
  inventory_vehicle_id?: string | null
  selected_clips: unknown
  video_script_id: string | null
  created_at: string | null
}

function capitalizeWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso))
}

export function buildJobNameFromInventory(
  brand: string,
  model: string,
  year: string | number | null | undefined
): string {
  const parts = [
    brand.trim(),
    model.trim(),
    year != null && String(year).trim() ? String(year).trim() : '',
  ].filter(Boolean)
  return capitalizeWords(parts.join(' ')).slice(0, 100)
}

export function vehicleIdFromJobMeta(
  selectedClips: unknown,
  scriptVehicleId?: string | null,
  queueVehicleId?: string | null,
  inventoryVehicleId?: string | null
): string | null {
  const fromColumn = inventoryVehicleId?.trim()
  if (fromColumn) return fromColumn

  if (isPipelineInputMeta(selectedClips)) {
    const fromMeta = selectedClips.vehicleId?.trim()
    if (fromMeta) return fromMeta
  }
  const fromScript = scriptVehicleId?.trim()
  if (fromScript) return fromScript
  const fromQueue = queueVehicleId?.trim()
  if (fromQueue) return fromQueue
  return null
}

export function resolveJobVehicleLabel(
  job: JobVehicleFields,
  inventory: InventoryVehicleSnippet | null
): ResolvedJobVehicle {
  const vehicleId = inventory?.id ?? job.inventory_vehicle_id?.trim() ?? null

  if (inventory) {
    const title = capitalizeWords(
      `${inventory.brand} ${inventory.model} ${inventory.year}`.trim()
    )
    const plate = inventory.plate?.trim()
    const line2 = job.vehicle_line_2?.trim()
    const subtitle =
      plate ||
      (line2 && line2.toLowerCase() !== inventory.model.trim().toLowerCase() ? line2 : null)
    return {
      vehicleId,
      title,
      subtitle,
      inventory,
    }
  }

  const line1 = job.vehicle_line_1?.trim()
  const line2 = job.vehicle_line_2?.trim()
  const line4 = job.vehicle_line_4?.trim()
  const fromLines = [line1, line2?.split(/\s+/)[0], line4].filter(Boolean).join(' ')
  if (fromLines) {
    return {
      vehicleId,
      title: capitalizeWords(fromLines),
      subtitle: line2 && line2 !== fromLines ? capitalizeWords(line2) : null,
      inventory: null,
    }
  }

  const jobName = job.job_name?.trim()
  if (jobName) {
    return {
      vehicleId: null,
      title: jobName,
      subtitle: null,
      inventory: null,
    }
  }

  return {
    vehicleId: null,
    title: `Reel · ${formatShortDate(job.created_at)}`,
    subtitle: job.id.slice(0, 8),
    inventory: null,
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 100 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}
