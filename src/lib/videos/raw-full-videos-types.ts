/** Bucket de videos enteros en bruto (otra herramienta), separado de clips/reels. */
export const RAW_FULL_VIDEOS_BUCKET = 'raw-full-videos-v2'

/** Límite por objeto (2 GB), alineado con raw-videos-v2. */
export const RAW_FULL_VIDEOS_MAX_BYTES = 2 * 1024 * 1024 * 1024

/** Máximo de videos enteros por carpeta de vehículo. */
export const RAW_FULL_VIDEOS_MAX_PER_FOLDER = 30

export type RawFullVideoInventorySnippet = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
  status: string | null
}

export type RawFullVideoFolderSummary = {
  id: string
  title: string
  subtitle: string | null
  inventoryVehicleId: string | null
  inventoryVehicleId2: string | null
  formato: string | null
  caption: string | null
  inventory: RawFullVideoInventorySnippet | null
  folderName: string | null
  videoCount: number
  totalBytes: number
  createdAt: string
  updatedAt: string
}

export type RawFullVideoItem = {
  path: string
  name: string
  signedUrl: string
  sizeBytes: number
  createdAt: string | null
}

export type RawFullVideoLibraryStats = {
  totalFolders: number
  totalVideos: number
  totalBytes: number
}
