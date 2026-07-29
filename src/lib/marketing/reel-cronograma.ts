import { getDay } from 'date-fns'
import type { ReelFormato } from '@/types/reel'

export type ReelCronogramaSlot = {
  /** Cuántos reels de este formato corresponde tener ese día. */
  count: number
  descripcion: string
}

export type ReelCronogramaFormatoKey = ReelFormato | 'creativo' | 'live'

export type ReelCronogramaRow = {
  formato: ReelCronogramaFormatoKey
  label: string
  /** Clave = día de la semana estilo `date-fns getDay` (0 = domingo ... 6 = sábado). */
  porDia: Partial<Record<number, ReelCronogramaSlot>>
  /**
   * Solo aparece en la tabla de referencia del front.
   * No alimenta el plan del día ni llama al backend.
   */
  soloVista?: boolean
}

const SLOT_LUN_VIE = [1, 2, 3, 4, 5] as const

function slotsForDays(
  days: readonly number[],
  slot: ReelCronogramaSlot
): Partial<Record<number, ReelCronogramaSlot>> {
  const out: Partial<Record<number, ReelCronogramaSlot>> = {}
  for (const d of days) out[d] = slot
  return out
}

/**
 * Cronograma semanal (referencia UI + plan del día).
 * Quién interviene (alineado al backend actual):
 * - Ficha / Duelo / Financiamiento / Detrás → "Marketing"
 * - POV / Gancho → 2 por día (A+B) con rotación Vanessa / Felipe / Xavier
 * - Creativo → solo vista del cronograma (no es formato de API)
 */
export const REEL_CRONOGRAMA: ReelCronogramaRow[] = [
  {
    formato: 'ficha_rapida',
    label: 'Ficha Rápida',
    porDia: slotsForDays(SLOT_LUN_VIE, {
      count: 3,
      descripcion: '1A, 1B, 1C · Marketing (3 autos)',
    }),
  },
  {
    formato: 'pov_gancho',
    label: 'POV / Gancho',
    porDia: {
      1: { count: 2, descripcion: 'Vanessa + Felipe (ganchoA + ganchoB)' },
      2: { count: 2, descripcion: 'Felipe + Xavier (ganchoA + ganchoB)' },
      3: { count: 2, descripcion: 'Xavier + Vanessa (ganchoA + ganchoB)' },
      4: { count: 2, descripcion: 'Vanessa + Felipe (ganchoA + ganchoB)' },
      5: { count: 2, descripcion: 'Felipe + Xavier (ganchoA + ganchoB)' },
    },
  },
  {
    formato: 'duelo',
    label: 'Comparativa/Duelo',
    porDia: {
      2: { count: 2, descripcion: '2 duelos · Marketing' },
      4: { count: 2, descripcion: '2 duelos · Marketing' },
    },
  },
  {
    formato: 'detras_camaras',
    label: 'Detrás de Cámaras',
    porDia: {
      1: { count: 1, descripcion: 'Marketing' },
      3: { count: 1, descripcion: 'Marketing' },
      5: { count: 1, descripcion: 'Marketing' },
    },
  },
  {
    formato: 'financiamiento',
    label: 'Financiamiento (5B)',
    porDia: {
      1: { count: 1, descripcion: 'Sí · Marketing' },
      3: { count: 1, descripcion: 'Sí · Marketing' },
      5: { count: 1, descripcion: 'Sí · Marketing' },
    },
  },
  {
    formato: 'creativo',
    label: 'Creativo',
    soloVista: true,
    porDia: slotsForDays(SLOT_LUN_VIE, {
      count: 1,
      descripcion: 'Creativo',
    }),
  },
  {
    formato: 'live',
    label: 'Live',
    soloVista: true,
    porDia: {
      1: { count: 1, descripcion: 'Live' },
      3: { count: 1, descripcion: 'Live' },
      5: { count: 1, descripcion: 'Live' },
    },
  },
]

/** Orden de columnas para mostrar (Lunes..Viernes). */
export const CRONOGRAMA_WEEKDAY_ORDER = [1, 2, 3, 4, 5]

export const CRONOGRAMA_WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

export type ReelCronogramaEsperado = {
  formato: ReelFormato
  label: string
  descripcion: string
  count: number
}

function isBackendFormato(formato: ReelCronogramaFormatoKey): formato is ReelFormato {
  return formato !== 'creativo' && formato !== 'live'
}

/** Qué formatos corresponde asignar/generar para una fecha (sin filas soloVista). */
export function getReelCronogramaDelDia(fechaYmd: string): ReelCronogramaEsperado[] {
  const weekday = getDay(new Date(`${fechaYmd}T12:00:00`))
  const result: ReelCronogramaEsperado[] = []
  for (const row of REEL_CRONOGRAMA) {
    if (row.soloVista || !isBackendFormato(row.formato)) continue
    const slot = row.porDia[weekday]
    if (slot) {
      result.push({
        formato: row.formato,
        label: row.label,
        descripcion: slot.descripcion,
        count: slot.count,
      })
    }
  }
  return result
}
