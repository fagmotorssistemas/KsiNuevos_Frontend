/** Segundos → "m:ss" (ej. 8 → "0:08", 232.8 → "3:52"). */
export function formatMusicTimeSec(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** "0:08", "3:52" o segundos decimales → segundos. */
export function parseMusicTimeInput(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null

  const colon = /^(\d+):(\d{1,2})$/.exec(t)
  if (colon) {
    const minutes = Number(colon[1])
    const seconds = Number(colon[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null
    return minutes * 60 + seconds
  }

  const n = Number(t.replace(',', '.'))
  if (Number.isFinite(n) && n >= 0) return n
  return null
}

export function clampMusicTrimSec(sec: number, maxSec: number): number {
  return Math.max(0, Math.min(sec, Math.max(0, maxSec)))
}
