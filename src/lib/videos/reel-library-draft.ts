export type ReelLibraryClipDraft = {
  path: string
  name: string
  signedUrl: string
  sizeBytes: number
  clipIndex: number | null
}

/** Precarga del modal Crear Reel desde la biblioteca de clips en bruto. */
export type ReelLibraryDraft = {
  sourceJobId: string
  folderTitle: string
  clips: ReelLibraryClipDraft[]
  vehicleId?: string | null
  vehicleLine1?: string | null
  vehicleLine2?: string | null
  vehicleLine3?: string | null
  vehicleLine4?: string | null
  jobName?: string | null
}
