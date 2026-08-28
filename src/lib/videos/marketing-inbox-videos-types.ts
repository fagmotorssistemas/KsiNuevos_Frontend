export const MARKETING_INBOX_VIDEOS_BUCKET = 'marketing-inbox-videos'

/** Límite por objeto (2 GB), alineado con raw-full-videos-v2. */
export const MARKETING_INBOX_VIDEOS_MAX_BYTES = 2 * 1024 * 1024 * 1024

/** Máximo de archivos por lote de subida a la bandeja. */
export const MARKETING_INBOX_VIDEOS_MAX_PER_BATCH = 40

export type MarketingInboxVideoItem = {
  id: string
  storagePath: string
  originalFilename: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedBy: string | null
  signedUrl: string
  createdAt: string
}
