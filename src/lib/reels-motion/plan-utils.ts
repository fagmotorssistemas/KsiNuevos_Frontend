/**
 * Piezas comunes a los planes de movimiento de todos los formatos (camioneta, familiar, premium):
 * enums compartidos, la regla de no tapar la cara y los normalizadores de lo que llega de la IA.
 */

export const ENTRANCES = ['caer', 'fondo', 'letras', 'golpe'] as const
export const SIZES = ['gigante', 'grande', 'mediano'] as const
export const SLOTS = ['arriba', 'centro', 'abajo'] as const

export type Entrance = (typeof ENTRANCES)[number]
export type Size = (typeof SIZES)[number]
export type Slot = (typeof SLOTS)[number]

export const MAX_BEATS = 24

/** Instrucción común: Claude ubica la cabeza de la persona en cada corte y el compositor la deja libre. */
export const FACE_PROMPT_RULE = `- Nunca tapes la cara de la persona: en cada gráfico pon "face_top" y "face_bottom" = dónde está la cabeza de la persona en ese corte (% del alto del cuadro, de la coronilla a la barbilla; míralo en el cuadro del corte), o null si no se ve a nadie. El sistema mueve el gráfico a una zona libre o lo quita si no cabe; elige "slot" pensando en eso (si la cara está al centro, arriba o abajo). Si en la toma la persona se mueve (camina, se agacha hacia el motor, se acerca a la cámara), marca una zona más amplia que cubra por dónde va a pasar su cabeza.`

export const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] })

export function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function pickOrNull<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

/** Texto de una línea, recortado; en mayúsculas salvo que se pida conservarlo. */
export function cleanText(value: unknown, max: number, upper = true): string {
  if (typeof value !== 'string') return ''
  const t = value.replace(/\s+/g, ' ').trim()
  const out = upper ? t.toUpperCase() : t
  return out.length > max ? out.slice(0, max).trim() : out
}

export function pct(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null
}

export function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export function cueWord(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Banda de la cabeza (face_top/face_bottom en %) o null; se descarta si viene al revés o vacía. */
export function faceBand(top: unknown, bottom: unknown): { face_top: number | null; face_bottom: number | null } {
  const t = pct(top)
  const b = pct(bottom)
  return t != null && b != null && b > t ? { face_top: t, face_bottom: b } : { face_top: null, face_bottom: null }
}
