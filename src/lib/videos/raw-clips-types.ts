export type InventoryVehicleSnippet = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
  status: string | null
}

export type RawClipsFolderSummary = {
  id: string
  title: string
  subtitle: string | null
  /** FK `video_jobs_v2.inventory_vehicle_id` cuando existe. */
  inventoryVehicleId: string | null
  vehicleId: string | null
  inventory: InventoryVehicleSnippet | null
  jobName: string | null
  vehicleLine2: string | null
  status: string
  flowType: string
  clipCount: number
  totalBytes: number
  createdAt: string
  updatedAt: string
  finalVideoUrl: string | null
  socialPublishStage: string | null
}

export type RawClipItem = {
  path: string
  name: string
  signedUrl: string
  sizeBytes: number
  createdAt: string | null
  clipIndex: number | null
}

export type RawClipsLibraryStats = {
  totalFolders: number
  totalClips: number
  totalBytes: number
}
