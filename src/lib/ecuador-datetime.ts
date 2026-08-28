/** Ecuador no usa DST: UTC−5 todo el año. */
export const ECUADOR_TZ = 'America/Guayaquil';
const ECUADOR_OFFSET_MS = 5 * 3_600_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Instantes de columnas `timestamp without time zone` en Supabase:
 * la sesión de Postgres es UTC, así que el reloj guardado es UTC.
 * Sin `Z`, `new Date()` lo trata como hora local y se ve 5 horas adelante.
 *
 * No usamos `timeZone: America/Guayaquil` al pintar: en Windows a veces
 * cae a UTC y muestra 23:39 cuando en Ecuador eran las 18:39.
 */
export function parseDbTimestamp(value: string): Date {
  const raw = value.trim();
  if (!raw) return new Date(NaN);

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?(.*)?$/,
  );
  if (!match) return new Date(NaN);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 12);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const suffix = (match[8] ?? '').trim();

  if (/^[zZ]$/.test(suffix) || /^[+-]\d{2}/.test(suffix)) {
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    return new Date(iso);
  }

  // timestamp without time zone: el reloj guardado es UTC, no la hora local del browser.
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/** Reloj de pared en Ecuador a partir de un instante UTC. */
export function ecuadorWallClock(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const ec = new Date(date.getTime() - ECUADOR_OFFSET_MS);
  return {
    year: ec.getUTCFullYear(),
    month: ec.getUTCMonth() + 1,
    day: ec.getUTCDate(),
    hour: ec.getUTCHours(),
    minute: ec.getUTCMinutes(),
    second: ec.getUTCSeconds(),
  };
}

function wallFromValue(value: string | Date): ReturnType<typeof ecuadorWallClock> | null {
  const date = typeof value === 'string' ? parseDbTimestamp(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return ecuadorWallClock(date);
}

export function formatEcuadorDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const w = wallFromValue(value);
  if (!w) return '—';
  return `${pad2(w.day)}/${pad2(w.month)}/${w.year}, ${pad2(w.hour)}:${pad2(w.minute)}`;
}

export function toEcuadorDatetimeLocal(value: string | Date): string {
  const w = wallFromValue(value);
  if (!w) return '';
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}T${pad2(w.hour)}:${pad2(w.minute)}`;
}

/** `datetime-local` en hora Ecuador → ISO con offset −05 (un solo salto a UTC). */
export function ecuadorDatetimeLocalToIso(local: string): string {
  if (!local) return new Date().toISOString();
  const [datePart, timePart = '00:00'] = local.split('T');
  const [hour = '00', minute = '00'] = timePart.split(':');
  return `${datePart}T${pad2(Number(hour))}:${pad2(Number(minute))}:00-05:00`;
}

export function ecuadorDatetimeLocalFromNow(daysOffset = 0): string {
  return toEcuadorDatetimeLocal(new Date(Date.now() + daysOffset * 86_400_000));
}

export function formatEcuadorDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const w = wallFromValue(value);
  if (!w) return 'Sin fecha';
  return `${pad2(w.day)}/${pad2(w.month)}/${w.year}`;
}

export function formatEcuadorTime(value: string | null | undefined): string {
  if (!value) return '—';
  const w = wallFromValue(value);
  if (!w) return '—';
  return `${pad2(w.hour)}:${pad2(w.minute)}`;
}

export function todayEcuadorDate(): string {
  const w = ecuadorWallClock(new Date());
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`;
}

export function ecuadorYmd(iso: string): string {
  const w = wallFromValue(iso);
  if (!w) return '';
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`;
}
