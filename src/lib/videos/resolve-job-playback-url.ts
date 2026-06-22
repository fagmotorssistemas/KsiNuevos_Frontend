/** URLs temporales de render (Shotstack S3, Creatomate CDN, etc.) suelen caducar o bloquear `<video>`. */
export function isExternalEphemeralReelUrl(url: string): boolean {
  const u = url.toLowerCase()
  if (!u) return false
  if (u.includes('/storage/v1/object/public/reels-v2/')) return false
  return (
    u.includes('shotstack') ||
    u.includes('amazonaws.com') ||
    u.includes('backblazeb2.com') ||
    u.includes('creatomate')
  )
}

/** URL pública del MP4 en bucket `reels-v2` (solo NEXT_PUBLIC, usable en cliente). */
export function buildFinalReelPublicUrlClient(jobId: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const id = jobId.trim()
  if (!base || !id) return null
  return `${base}/storage/v1/object/public/reels-v2/${id}.mp4`
}

/**
 * URL de reproducción para tarjetas / preview.
 * Si el job guardó URL temporal externa, usa el copy en Supabase Storage.
 */
export function resolveJobPlaybackUrl(
  jobId: string,
  finalVideoUrl: string | null | undefined
): string | null {
  const url = finalVideoUrl?.trim()
  if (!url) return null
  if (isExternalEphemeralReelUrl(url)) {
    return buildFinalReelPublicUrlClient(jobId) ?? url
  }
  return url
}
