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
  vehicle_line_2: string | null
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

export function vehicleIdFromJobMeta(
  selectedClips: unknown,
  scriptVehicleId?: string | null,
  queueVehicleId?: string | null
): string | null {
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
  const vehicleId = inventory?.id ?? null

  if (inventory) {
    const title = capitalizeWords(
      `${inventory.brand} ${inventory.model} ${inventory.year}`.trim()
    )
    return {
      vehicleId,
      title,
      subtitle: inventory.plate?.trim() || null,
      inventory,
    }
  }

  const line2 = job.vehicle_line_2?.trim()
  if (line2) {
    return {
      vehicleId: null,
      title: capitalizeWords(line2),
      subtitle: null,
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
