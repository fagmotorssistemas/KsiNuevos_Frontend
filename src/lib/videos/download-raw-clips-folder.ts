import { sanitizeDownloadFilename } from '@/lib/download-image-as-png'
import type { RawClipItem } from '@/lib/videos/raw-clips-types'

export type RawClipsFolderDownloadProgress = (message: string) => void

function clipDownloadFilename(clip: RawClipItem, index: number): string {
  const raw = clip.name.split('/').pop() ?? clip.name
  const dot = raw.lastIndexOf('.')
  const ext = dot >= 0 ? raw.slice(dot).toLowerCase() : '.mp4'
  const stem = dot >= 0 ? raw.slice(0, dot) : raw
  const safeStem = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  const order =
    clip.clipIndex != null
      ? String(clip.clipIndex + 1).padStart(2, '0')
      : String(index + 1).padStart(2, '0')
  return `clip-${order}-${safeStem || 'video'}${ext}`
}

/** Descarga todos los clips de una carpeta de biblioteca en un ZIP (navegador). */
export async function downloadRawClipsFolderAsZip(
  clips: RawClipItem[],
  folderTitle: string,
  onProgress?: RawClipsFolderDownloadProgress
): Promise<void> {
  if (!clips.length) {
    throw new Error('No hay clips para descargar')
  }

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const folderName = sanitizeDownloadFilename(folderTitle.replace(/\.zip$/i, ''))
  const folder = zip.folder(folderName)
  if (!folder) throw new Error('No se pudo crear el archivo ZIP')

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]!
    onProgress?.(`Descargando clip ${i + 1} de ${clips.length}…`)

    const res = await fetch(clip.signedUrl)
    if (!res.ok) {
      throw new Error(`No se pudo descargar "${clip.name}" (HTTP ${res.status})`)
    }

    const buffer = await res.arrayBuffer()
    folder.file(clipDownloadFilename(clip, i), buffer)
  }

  onProgress?.('Empaquetando ZIP…')
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  })

  const zipName = `${folderName}.zip`
  const url = URL.createObjectURL(content)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = zipName
    anchor.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
