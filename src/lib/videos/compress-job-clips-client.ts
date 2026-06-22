/** Umbral (MB) enviado al backend NestJS; el servidor decide qué clips comprimir. */
export const VIDEO_COMPRESS_THRESHOLD_MB = 30

export type CompressClipsApiResult = {
  compressed?: string[]
  compressedCount?: number
  skipped?: string[]
  errors?: string[]
}

/**
 * Pide al backend NestJS comprimir clips grandes del job en Storage.
 * Envía todos los paths; el servidor filtra por thresholdMb.
 * Lanza si el servicio falla por completo (p. ej. env vars o Nest caído).
 */
export async function compressJobClipsOrThrow(
  jobId: string,
  paths: string[],
  onProgress?: (message: string) => void
): Promise<number> {
  if (paths.length === 0) return 0

  onProgress?.(
    `Optimizando clips en servidor (${paths.length}) — puede tardar 2-3 min si son archivos grandes…`
  )

  let data: CompressClipsApiResult
  try {
    const compressRes = await fetch(`/api/videos/jobs/${jobId}/compress-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paths,
        thresholdMb: VIDEO_COMPRESS_THRESHOLD_MB,
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
  const count = compressed.length > 0 ? compressed.length : (data.compressedCount ?? 0)

  if (count > 0) {
    onProgress?.(`${count} clip(s) optimizado(s). Continuando…`)
    if (errors.length > 0) {
      console.warn(
        `[compress-clips][${jobId}] ${count} comprimido(s), ${errors.length} error(es):`,
        errors
      )
    }
    return count
  }

  if (errors.length > 0) {
    throw new Error(
      'No se pudieron optimizar los clips en el servidor (backend de video no disponible o compresión fallida). ' +
        'Comprime los videos manualmente o contacta soporte antes de continuar.'
    )
  }

  return 0
}
