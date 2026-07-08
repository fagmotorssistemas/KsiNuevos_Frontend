import {
  buildFilenameClipOrderIndices,
  sortClipIndicesByFileName,
} from './sort-video-files-by-name'

/** Preserva el orden arrastrado; solo quita bloqueados y añade nuevos al final (por nombre). */
export function syncManualClipOrderOnEligibilityChange(
  prev: number[],
  eligible: number[],
  files: File[]
): number[] {
  if (prev.length === 0) {
    return sortClipIndicesByFileName(files, eligible)
  }
  const kept = prev.filter((i) => eligible.includes(i))
  const missing = eligible.filter((i) => !kept.includes(i))
  if (missing.length === 0) return kept
  return [...kept, ...sortClipIndicesByFileName(files, missing)]
}

/** Biblioteca: los clips se copian al storage ya en el orden de la UI. */
export function libraryUsesPhysicalClipReorder(
  usingLibraryClips: boolean,
  manualFullClipOrderEnabled: boolean,
  manualClipOrderIndices: number[],
  totalClipCount: number
): boolean {
  return (
    usingLibraryClips &&
    manualFullClipOrderEnabled &&
    manualClipOrderIndices.length > 0 &&
    manualClipOrderIndices.length === totalClipCount
  )
}

/**
 * Tras reordenar físicamente en biblioteca, storage[i] = biblioteca[uiUploadOrder[i]].
 * El pipeline debe usar índices de storage en orden 0,1,2… (omitendo VO/planos reservados).
 */
export function pipelineManualOrderAfterLibraryPhysicalUpload(
  uiUploadOrder: number[],
  isBlockedForNarrative: (libraryIndex: number) => boolean
): number[] {
  const out: number[] = []
  for (let storageIdx = 0; storageIdx < uiUploadOrder.length; storageIdx++) {
    const libraryIdx = uiUploadOrder[storageIdx]!
    if (!isBlockedForNarrative(libraryIdx)) out.push(storageIdx)
  }
  return out
}

export function remapUiClipIndexToStorageAfterLibraryReorder(
  uiIndex: number,
  uiUploadOrder: number[]
): number {
  const storageIdx = uiUploadOrder.indexOf(uiIndex)
  if (storageIdx < 0) {
    throw new Error(`El clip ${uiIndex} no está en la lista de subida.`)
  }
  return storageIdx
}

export function buildManualClipOrderFinalizePayload(args: {
  flowType: string
  clipCount: number
  manualFullClipOrderEnabled: boolean
  forceAllManualOrderClips: boolean
  manualClipOrderIndices: number[]
  clipUiFiles: File[]
  usingLibraryClips: boolean
  hasManualIntro: boolean
  isBlocked: (clipIndex: number) => boolean
}): Record<string, unknown> {
  if (args.flowType !== 'multiple' || args.clipCount < 2 || args.hasManualIntro) {
    return {}
  }

  const eligible = buildFilenameClipOrderIndices(args.clipUiFiles, args.isBlocked)
  const uiOrder =
    args.manualFullClipOrderEnabled && args.manualClipOrderIndices.length > 0
      ? args.manualClipOrderIndices
      : eligible

  const ok =
    eligible.length > 0 &&
    eligible.length === uiOrder.length &&
    eligible.every((i) => uiOrder.includes(i))
  if (!ok) {
    throw new Error(
      'Orden de clips: revisa que la lista incluya exactamente todos los clips del montaje (sin el de VO ni los planos reservados).'
    )
  }

  const physicalReorder = libraryUsesPhysicalClipReorder(
    args.usingLibraryClips,
    args.manualFullClipOrderEnabled,
    args.manualClipOrderIndices,
    args.clipCount
  )

  const pipelineOrder = physicalReorder
    ? pipelineManualOrderAfterLibraryPhysicalUpload(uiOrder, args.isBlocked)
    : uiOrder

  return {
    manualClipOrderIndices: pipelineOrder,
    ...(args.manualFullClipOrderEnabled && args.forceAllManualOrderClips
      ? { forceAllManualOrderClips: true }
      : {}),
  }
}
