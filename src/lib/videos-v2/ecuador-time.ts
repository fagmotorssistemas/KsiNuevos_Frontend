/** Ecuador (Guayaquil) no usa DST: desfase fijo UTC−5 respecto a UTC. */
export function ecuadorLocalDateTimeToUtcIso(dateYmd: string, hhmm: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const [hh, mi] = hhmm.split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mi)) {
    throw new Error('Fecha u hora inválida')
  }
  const utcMs = Date.UTC(y, m - 1, d, hh + 5, mi, 0, 0)
  return new Date(utcMs).toISOString()
}

export function formatUtcForEcuadorDisplay(isoUtc: string): string {
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(isoUtc))
}

/** Convierte instante UTC guardado en BD a campos date/time locales Ecuador para inputs HTML. */
export function utcIsoToEcuadorDateAndTime(isoUtc: string): { dateYmd: string; timeHm: string } {
  const d = new Date(isoUtc)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ''
  const y = get('year')
  const m = get('month')
  const day = get('day')
  let hh = get('hour')
  let mm = get('minute')
  if (hh.length === 1) hh = `0${hh}`
  if (mm.length === 1) mm = `0${mm}`
  return { dateYmd: `${y}-${m}-${day}`, timeHm: `${hh}:${mm}` }
}
