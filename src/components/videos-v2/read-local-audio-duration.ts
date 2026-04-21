/**
 * Duración en segundos de un archivo de audio local (p. ej. MP3 de voz en off).
 * Usa el elemento HTMLAudioElement; no sube el archivo al servidor.
 */
export async function readLocalAudioDurationSeconds(file: File): Promise<number | null> {
  if (!file.type.startsWith('audio/')) return null
  const url = URL.createObjectURL(file)
  try {
    const duration = await new Promise<number | null>((resolve) => {
      const audio = new Audio()
      const done = (d: number | null) => {
        URL.revokeObjectURL(url)
        resolve(d)
      }
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        const d = audio.duration
        done(Number.isFinite(d) && d > 0.05 ? Number(d.toFixed(3)) : null)
      }
      audio.onerror = () => done(null)
      audio.src = url
    })
    return duration
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}
