export type NormalizeClipsApiResult = {
  normalized?: string[]
  skipped?: string[]
  skipDetails?: Array<{ path: string; reason: string }>
  errors?: string[]
  error?: string
}

/**
 * Endereza clips en Storage (rotate → píxeles verticales) para Honor/móvil.
 * Automático: no bloquea el flujo si ffmpeg no está; sí falla si hay error de proceso real.
 */
export async function normalizeJobClipsBestEffort(
  jobId: string,
  paths: string[],
  onProgress?: (message: string) => void
): Promise<number> {
  if (paths.length === 0) return 0

  onProgress?.(`Ajustando orientación vertical en servidor…`)

  let data: NormalizeClipsApiResult
  try {
    const res = await fetch(`/api/videos/jobs/${jobId}/normalize-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
    data = (await res.json()) as NormalizeClipsApiResult
    if (!res.ok) {
      console.warn(`[normalize-clips][${jobId}] HTTP ${res.status}:`, data.error)
      onProgress?.('Orientación: omitida (servidor no pudo ajustar). Continuando…')
      return 0
    }
  } catch (err) {
    console.warn(`[normalize-clips][${jobId}]`, err)
    onProgress?.('Orientación: omitida. Continuando…')
    return 0
  }

  const normalized = data.normalized ?? []
  const errors = data.errors ?? []
  const skipDetails = data.skipDetails ?? []
  const ffmpegMissing = skipDetails.some((d) => /ffmpeg|ffprobe|enoent/i.test(d.reason))

  if (normalized.length > 0) {
    onProgress?.(`${normalized.length} clip(s) en vertical correcta.`)
  }

  if (errors.length > 0) {
    console.warn(`[normalize-clips][${jobId}]`, errors)
    // No abortar el reel: avisar y seguir (mismo comportamiento que compresión parcial).
    onProgress?.(
      `Orientación: ${errors.length} clip(s) no se pudieron ajustar. Continuando…`
    )
  } else if (ffmpegMissing && normalized.length === 0) {
    console.warn(`[normalize-clips][${jobId}] Nest/ffmpeg no disponible para orientación`)
  }

  return normalized.length
}
