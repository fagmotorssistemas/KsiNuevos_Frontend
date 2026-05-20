/** Mensaje legible desde cualquier valor lanzado (DOMException, objeto ffmpeg, etc.). */
export function extractErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.trim()) return err.trim()
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
    if (typeof o.reason === 'string' && o.reason.trim()) return o.reason.trim()
  }
  try {
    const s = JSON.stringify(err)
    if (s && s !== '{}') return s
  } catch {
    /* ignore */
  }
  return fallback
}
