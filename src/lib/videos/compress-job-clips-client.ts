/** Umbral (MB) enviado al backend NestJS; el servidor decide qué clips comprimir. */
export const VIDEO_COMPRESS_THRESHOLD_MB = 30

export type CompressClipsApiResult = {
  /** Paths de entrega (.mp4) tras transcode. */
  compressed?: string[]
  compressedCount?: number
  skipped?: string[]
  errors?: string[]
  /** Origen → entrega (.mov → .mp4). Obligatorio usar en finalize/pipeline. */
  pathRemap?: Record<string, string>
}

export type CompressJobClipsResult = {
  count: number
  /** Mismas posiciones que `paths`, ya remapeadas a entrega MP4 si Nest las cambió. */
  remappedPaths: string[]
  pathRemap: Record<string, string>
}

/**
 * Pide al backend NestJS comprimir clips del job en Storage.
 * Con `normalizeOrientation: true` Nest endereza (ffprobe) solo lo necesario
 * y limpia metadato rotate — Shotstack transform.rotate quedó desactivado (dañaba clips).
 *
 * Tras comprimir, Nest sube un **.mp4 H.264** de entrega (no reescribe el .mov).
 * Hay que usar `remappedPaths` en finalize para que Shotstack no baje el original.
 */
export async function compressJobClipsOrThrow(
  jobId: string,
  paths: string[],
  onProgress?: (message: string) => void
): Promise<CompressJobClipsResult> {
  if (paths.length === 0) {
    return { count: 0, remappedPaths: [], pathRemap: {} }
  }

  onProgress?.(
    `Optimizando clips en servidor (${paths.length}) — orientación + tamaño si hace falta…`
  )

  let data: CompressClipsApiResult
  try {
    const compressRes = await fetch(`/api/videos/jobs/${jobId}/compress-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paths,
        thresholdMb: VIDEO_COMPRESS_THRESHOLD_MB,
        normalizeOrientation: true,
        /** CapCut-like: Nest aplica eq+unsharp al transcodificar. */
        enhanceColor: true,
      }),
    })
    data = (await compressRes.json()) as CompressClipsApiResult
  } catch {
    throw new Error(
      'No se pudo contactar el servicio de optimización de clips. Revisa tu conexión e inténtalo de nuevo.'
    )
  }

  const compressed = data.compressed ?? []
  const errors = data.errors ?? []
  const pathRemap = data.pathRemap ?? {}
  const count = compressed.length > 0 ? compressed.length : (data.compressedCount ?? 0)

  const remappedPaths = paths.map((p) => {
    const viaRemap = pathRemap[p]
    if (viaRemap) return viaRemap
    // Compat: Nest viejo devolvía el mismo path en compressed
    const hit = compressed.find(
      (c) => c === p || c.replace(/\.[^.]+$/i, '') === p.replace(/\.[^.]+$/i, '')
    )
    return hit ?? p
  })

  if (Object.keys(pathRemap).length > 0) {
    console.log(`[compress-clips][${jobId}] pathRemap:`, pathRemap)
  }

  if (count > 0) {
    onProgress?.(`${count} clip(s) optimizado(s) a MP4 de entrega. Continuando…`)
    if (errors.length > 0) {
      console.warn(
        `[compress-clips][${jobId}] ${count} comprimido(s), ${errors.length} error(es):`,
        errors
      )
    }
    return { count, remappedPaths, pathRemap }
  }

  if (errors.length > 0) {
    throw new Error(
      'No se pudieron optimizar los clips en el servidor (backend de video no disponible o compresión fallida). ' +
        'Comprime los videos manualmente o contacta soporte antes de continuar.'
    )
  }

  return { count: 0, remappedPaths: paths, pathRemap }
}
