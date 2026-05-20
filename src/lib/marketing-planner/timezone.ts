import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

export const ECUADOR_TZ = 'America/Guayaquil'

export function ecuadorCalendarParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ECUADOR_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), day: get('day'), h: get('hour'), min: get('minute') }
}

/** ISO local (sin Z) para inputs datetime-local en hora Ecuador */
export function toEcuadorLocalInputValue(iso: string | Date) {
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  const p = ecuadorCalendarParts(d)
  return `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
}

export function ecuadorLocalInputToIso(local: string) {
  if (!local) return new Date().toISOString()
  const [datePart, timePart = '00:00'] = local.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const utcGuess = new Date(Date.UTC(y, m - 1, d, h, min))
  const p = ecuadorCalendarParts(utcGuess)
  const offsetMin = (h - p.h) * 60 + (min - p.min)
  return new Date(utcGuess.getTime() + offsetMin * 60_000).toISOString()
}

export function formatEcuador(iso: string, pattern: string) {
  const d = parseISO(iso)
  const p = ecuadorCalendarParts(d)
  const local = new Date(p.y, p.m - 1, p.day, p.h, p.min)
  return format(local, pattern, { locale: es })
}

export function getWeekRange(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return { start, end }
}

export function getMonthRange(anchor: Date) {
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
}

export function getDayRange(anchor: Date) {
  return { start: startOfDay(anchor), end: endOfDay(anchor) }
}

export function shiftCalendarAnchor(anchor: Date, view: 'day' | 'week' | 'month', dir: -1 | 1) {
  if (view === 'day') return addDays(anchor, dir)
  if (view === 'week') return addWeeks(anchor, dir)
  return addMonths(anchor, dir)
}

export function rangeToIsoQuery(start: Date, end: Date) {
  return { from: start.toISOString(), to: end.toISOString() }
}

/** Minutos desde medianoche (hora Ecuador) para posicionar en grid */
export function minutesFromMidnightEcuador(iso: string) {
  const p = ecuadorCalendarParts(parseISO(iso))
  return p.h * 60 + p.min
}

export function nowMinutesEcuador() {
  return minutesFromMidnightEcuador(new Date().toISOString())
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function ecuadorNowLocalParts() {
  const p = ecuadorCalendarParts()
  return {
    dateYmd: `${p.y}-${pad2(p.m)}-${pad2(p.day)}`,
    timeHm: `${pad2(p.h)}:${pad2(p.min)}`,
  }
}

/** Separa valor tipo `datetime-local` (YYYY-MM-DDTHH:mm). */
export function splitLocalDateTime(local: string) {
  if (!local) return { dateYmd: '', timeHm: '18:00' }
  if (!local.includes('T')) {
    const now = ecuadorNowLocalParts()
    return { dateYmd: now.dateYmd, timeHm: now.timeHm }
  }
  const [datePart, timePart] = local.split('T')
  const [h = '09', min = '00'] = (timePart ?? '09:00').split(':')
  return { dateYmd: datePart, timeHm: `${pad2(Number(h))}:${pad2(Number(min))}` }
}

export function joinLocalDateTime(dateYmd: string, timeHm: string) {
  if (!dateYmd) return ''
  const parts = (timeHm || '09:00').split(':').map(Number)
  const h = parts[0] ?? 9
  const m = parts[1] ?? 0
  return `${dateYmd}T${pad2(h)}:${pad2(m)}`
}

export function formatLocalDateTimePreview(local: string, allDay = false) {
  if (!local) return 'Sin fecha'
  try {
    const iso = ecuadorLocalInputToIso(local)
    if (allDay) return formatEcuador(iso, "EEEE d 'de' MMMM yyyy")
    return formatEcuador(iso, "EEEE d MMM yyyy · HH:mm")
  } catch {
    return local
  }
}

export function endOfDayLocal(dateYmd: string) {
  return joinLocalDateTime(dateYmd, '23:59')
}

export function startOfDayLocal(dateYmd: string) {
  return joinLocalDateTime(dateYmd, '00:00')
}

export function addMinutesToLocal(local: string, minutes: number) {
  const iso = ecuadorLocalInputToIso(local)
  return toEcuadorLocalInputValue(new Date(new Date(iso).getTime() + minutes * 60_000))
}
