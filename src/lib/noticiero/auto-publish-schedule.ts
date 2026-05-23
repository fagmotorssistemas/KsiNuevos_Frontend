import { ecuadorLocalDateTimeToUtcIso } from '@/lib/videos/ecuador-time'

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

/** Día de la semana en zona Ecuador (America/Guayaquil). */
export function getEcuadorDayKey(date = new Date()): DayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    weekday: 'long',
  }).format(date)
  return weekday.toLowerCase() as DayKey
}

/** Hora local Ecuador HH:mm. */
export function getEcuadorTimeHm(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
}

/** Fecha YYYY-MM-DD en Ecuador. */
export function getEcuadorDateYmd(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value ?? '2000'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

function dayIndex(key: DayKey): number {
  return DAY_KEYS.indexOf(key)
}

/**
 * Calcula la próxima ejecución según publish_days y publish_time (hora Ecuador, UTC-5).
 * Ecuador no usa DST; publish_time se interpreta siempre en America/Guayaquil.
 */
export function computeNextRunAt(publishDays: string[], publishTime: string, from = new Date()): string {
  const activeDays = publishDays.filter((d): d is DayKey => DAY_KEYS.includes(d as DayKey))
  if (activeDays.length === 0) {
    throw new Error('Debe haber al menos un día de publicación activo')
  }

  const [hhStr, mmStr] = publishTime.split(':')
  const hh = Number(hhStr)
  const mm = Number(mmStr)
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error('Hora de publicación inválida')
  }

  const ecuadorYmd = getEcuadorDateYmd(from)
  const ecuadorDay = getEcuadorDayKey(from)
  const ecuadorNowHm = getEcuadorTimeHm(from)
  const todayIdx = dayIndex(ecuadorDay)

  const sortedDayIdx = [...new Set(activeDays.map((d) => dayIndex(d)))].sort((a, b) => a - b)

  for (let offset = 0; offset <= 7; offset++) {
    const candidateIdx = (todayIdx + offset) % 7
    const candidateKey = DAY_KEYS[candidateIdx]
    if (!activeDays.includes(candidateKey)) continue

    const candidateDate = new Date(from.getTime() + offset * 86_400_000)
    const candidateYmd = getEcuadorDateYmd(candidateDate)
    const timeHm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

    if (offset === 0 && timeHm <= ecuadorNowHm) {
      continue
    }

    return ecuadorLocalDateTimeToUtcIso(candidateYmd, timeHm)
  }

  // Fallback: próximo día activo en la semana
  const nextIdx = sortedDayIdx.find((i) => i > todayIdx) ?? sortedDayIdx[0]
  const daysUntil = nextIdx > todayIdx ? nextIdx - todayIdx : 7 - todayIdx + nextIdx
  const target = new Date(from.getTime() + daysUntil * 86_400_000)
  const targetYmd = getEcuadorDateYmd(target)
  const timeHm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  return ecuadorLocalDateTimeToUtcIso(targetYmd, timeHm)
}

export function formatNextRunDisplay(isoUtc: string | null): string {
  if (!isoUtc) return '—'
  const d = new Date(isoUtc)
  const day = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  const time = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  const capitalized = day.charAt(0).toUpperCase() + day.slice(1)
  return `${capitalized} a las ${time}`
}

/** Ventana de ±10 min para coincidir con el cron de Vercel. */
export function isWithinPublishWindow(publishTime: string, now = new Date()): boolean {
  const current = getEcuadorTimeHm(now)
  const [ch, cm] = current.split(':').map(Number)
  const [ph, pm] = publishTime.split(':').map(Number)
  const currentMins = ch * 60 + cm
  const publishMins = ph * 60 + pm
  return Math.abs(currentMins - publishMins) <= 10
}
