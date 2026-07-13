export type NormalizeClipsApiResult = {
  normalized?: string[]
  skipped?: string[]
  errors?: string[]
  error?: string
}

/**
 * Endereza clips en Storage (rotate → píxeles verticales) antes de comprimir/renderizar.
 */
export async function normalizeJobClipsOrThrow(
  jobId: string,
  paths: string[],
  onProgress?: (message: string) => void
): Promise<number> {
  if (paths.length === 0) return 0

  onProgress?.(`Enderezando orientación de ${paths.length} clip(s)…`)

  let data: NormalizeClipsApiResult
  try {
    const res = await fetch(`/api/videos/jobs/${jobId}/normalize-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
    data = (await res.json()) as NormalizeClipsApiResult
    if (!res.ok) {
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `No se pudo enderezar la orientación de los clips (${msg}). Comprueba que ffmpeg esté disponible en el servidor.`
    )
  }

  const normalized = data.normalized ?? []
  const errors = data.errors ?? []

  if (normalized.length > 0) {
    onProgress?.(`${normalized.length} clip(s) enderezado(s).`)
  }

  if (errors.length > 0) {
    console.warn(`[normalize-clips][${jobId}]`, errors)
    throw new Error(
      `No se pudo enderezar ${errors.length} clip(s): ${errors[0]?.slice(0, 200) ?? 'error desconocido'}`
    )
  }

  return normalized.length
}
