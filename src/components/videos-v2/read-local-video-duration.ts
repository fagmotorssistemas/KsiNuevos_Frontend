/**
 * Lee la duración en segundos de un archivo de video local (metadata en el navegador).
 * Sirve de respaldo cuando el servidor no tiene ffprobe (p. ej. Vercel).
 */
export function readLocalVideoDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const MS_TIMEOUT = 20_000

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }

    const finish = (value: number | null) => {
      window.clearTimeout(timer)
      cleanup()
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(null), MS_TIMEOUT)

    video.onloadedmetadata = () => {
      const d = video.duration
      if (Number.isFinite(d) && d > 0.05 && d !== Number.POSITIVE_INFINITY) {
        finish(Number(d.toFixed(3)))
      } else {
        finish(null)
      }
    }

    video.onerror = () => finish(null)

    video.src = url
  })
}
