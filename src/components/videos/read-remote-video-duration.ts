/**
 * Lee la duración en segundos de un video remoto (URL firmada de Storage).
 */
export function readRemoteVideoDurationSeconds(url: string): Promise<number | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    const MS_TIMEOUT = 25_000

    const cleanup = () => {
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
