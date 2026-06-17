import { toast } from 'sonner'

export interface DownloadFinalReelOptions {
  url: string
  jobId?: string
  filename?: string | null
}

function sanitizeDownloadFilename(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-\sáéíóúñÁÉÍÓÚÑ]/g, '').trim().slice(0, 80)
  const base = cleaned || 'reel'
  return base.toLowerCase().endsWith('.mp4') ? base : `${base}.mp4`
}

function resolveFilename(options: DownloadFinalReelOptions): string {
  if (options.filename?.trim()) {
    return sanitizeDownloadFilename(options.filename.trim())
  }
  if (options.jobId) {
    return sanitizeDownloadFilename(`video-job-${options.jobId.slice(0, 8)}`)
  }
  return sanitizeDownloadFilename(`reel-${Date.now()}`)
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(blobUrl)
}

async function downloadViaApi(jobId: string, filename: string): Promise<void> {
  const res = await fetch(`/api/videos/jobs/${encodeURIComponent(jobId)}/download`, {
    credentials: 'include',
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `No se pudo descargar (HTTP ${res.status})`)
  }
  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}

async function downloadViaUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`No se pudo descargar (HTTP ${res.status})`)
  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}

/** Descarga un reel final: API same-origin (preferida) o fetch directo a la URL pública. */
export async function downloadFinalReel(options: DownloadFinalReelOptions): Promise<void> {
  const filename = resolveFilename(options)

  if (options.jobId) {
    try {
      await downloadViaApi(options.jobId, filename)
      return
    } catch (apiError) {
      console.warn('[downloadFinalReel] API no disponible, intentando URL directa:', apiError)
    }
  }

  try {
    await downloadViaUrl(options.url, filename)
  } catch (urlError) {
    console.error('[downloadFinalReel] URL directa falló:', urlError)
    window.open(options.url, '_blank', 'noopener,noreferrer')
    toast.error('No se pudo forzar descarga directa. Se abrió el video en otra pestaña.')
    throw urlError
  }
}
