/** Orden natural por nombre (IMG_5114 < IMG_5115 < IMG_5118). Huecos en la secuencia se ignoran. */

type SortKey =
  | { type: 'recording'; ms: number }
  | { type: 'img'; num: number }
  | { type: 'fallback'; name: string }

/** DJI Mimo export: `Dji Mimo …` o `dji_mimo_…` — 2.º timestamp YYYYMMDDHHMMSS = grabación real. */
const DJI_MIMO_RECORDING_RE =
  /dji[\s_]+mimo[\s_]+\d{8}[\s_]+\d{6}[\s_]+(\d{14})/i

/** Tarjeta microSD Pocket 3: `DJI_YYYYMMDDHHMMSS_…` */
const DJI_SD_RECORDING_RE = /\bDJI_(\d{14})/i

const IMG_SEQUENCE_RE = /\bIMG_(\d+)/i

function basename(filename: string): string {
  const parts = filename.split(/[/\\]/)
  return parts[parts.length - 1] ?? filename
}

function parseRecordingTimestamp14(value: string): number | null {
  if (!/^\d{14}$/.test(value)) return null
  const y = Number(value.slice(0, 4))
  const mo = Number(value.slice(4, 6))
  const d = Number(value.slice(6, 8))
  const h = Number(value.slice(8, 10))
  const mi = Number(value.slice(10, 12))
  const se = Number(value.slice(12, 14))
  const ms = Date.UTC(y, mo - 1, d, h, mi, se)
  if (!Number.isFinite(ms)) return null
  return ms
}

function extractSortKey(filename: string): SortKey {
  const base = basename(filename)

  const djiMimo = base.match(DJI_MIMO_RECORDING_RE)
  if (djiMimo) {
    const ms = parseRecordingTimestamp14(djiMimo[1]!)
    if (ms != null) return { type: 'recording', ms }
  }

  const djiSd = base.match(DJI_SD_RECORDING_RE)
  if (djiSd) {
    const ms = parseRecordingTimestamp14(djiSd[1]!)
    if (ms != null) return { type: 'recording', ms }
  }

  const img = base.match(IMG_SEQUENCE_RE)
  if (img) {
    const num = Number.parseInt(img[1]!, 10)
    if (Number.isFinite(num)) return { type: 'img', num }
  }

  return { type: 'fallback', name: base }
}

function compareSortKeys(a: SortKey, b: SortKey, originalA: string, originalB: string): number {
  if (a.type === 'recording' && b.type === 'recording') {
    return a.ms - b.ms || localeCompareFallback(originalA, originalB)
  }
  if (a.type === 'img' && b.type === 'img') {
    return a.num - b.num || localeCompareFallback(originalA, originalB)
  }
  return localeCompareFallback(originalA, originalB)
}

function localeCompareFallback(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function compareVideoFileNames(a: string, b: string): number {
  return compareSortKeys(extractSortKey(a), extractSortKey(b), a, b)
}

export function sortVideoFilesByNameSequence(files: File[]): File[] {
  return [...files].sort((a, b) => compareVideoFileNames(a.name, b.name))
}

/** Índices de clip ordenados por nombre del archivo en `files`. */
export function sortClipIndicesByFileName(files: File[], indices: number[]): number[] {
  return [...indices].sort((a, b) => compareVideoFileNames(files[a]?.name ?? '', files[b]?.name ?? ''))
}

/** Clips elegibles (sin VO reservado) en orden de secuencia por nombre / timestamp de grabación. */
export function buildFilenameClipOrderIndices(
  files: File[],
  isBlocked: (clipIndex: number) => boolean
): number[] {
  const eligible = files.map((_, i) => i).filter((i) => !isBlocked(i))
  return sortClipIndicesByFileName(files, eligible)
}
