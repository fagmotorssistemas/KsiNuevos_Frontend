/** Orden natural por nombre (IMG_5114 < IMG_5115 < IMG_5118). Huecos en la secuencia se ignoran. */
export function compareVideoFileNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortVideoFilesByNameSequence(files: File[]): File[] {
  return [...files].sort((a, b) => compareVideoFileNames(a.name, b.name))
}

/** Índices de clip ordenados por nombre del archivo en `files`. */
export function sortClipIndicesByFileName(files: File[], indices: number[]): number[] {
  return [...indices].sort((a, b) => compareVideoFileNames(files[a]?.name ?? '', files[b]?.name ?? ''))
}

/** Clips elegibles (sin VO reservado) en orden de secuencia IMG_… */
export function buildFilenameClipOrderIndices(
  files: File[],
  isBlocked: (clipIndex: number) => boolean
): number[] {
  const eligible = files.map((_, i) => i).filter((i) => !isBlocked(i))
  return sortClipIndicesByFileName(files, eligible)
}
