import { getDay } from 'date-fns'
import type { ReelFormato } from '@/types/reel'

export type ReelCronogramaSlot = {
  /** Cuántos reels de este formato corresponde tener ese día. */
  count: number
  descripcion: string
}

export type ReelCronogramaRow = {
  formato: ReelFormato
  label: string
  /** Clave = día de la semana estilo `date-fns getDay` (0 = domingo ... 6 = sábado). */
  porDia: Partial<Record<number, ReelCronogramaSlot>>
}

/**
 * Cronograma semanal de asignación automática (crons `reels-*-asignar`).
 * Quién interviene (backend):
 * - Ficha Rápida / Duelo / Financiamiento → label fijo "Marketing"
 *   (un solo assignee técnico; sin round-robin entre usuarios)
 * - POV 3 Ganchos → Vanessa, Felipe, Xavier (1 cada uno; cámara = Marketing)
 * - Detrás de Cámaras → solo el del día (Lun Vanessa / Mié Felipe / Vie Xavier)
 * Es una referencia estática; si el cron cambia, actualizar a mano.
 */
export const REEL_CRONOGRAMA: ReelCronogramaRow[] = [
  {
    formato: 'ficha_rapida',
    label: 'Ficha Rápida',
    porDia: {
      1: { count: 3, descripcion: '1A, 1B, 1C · Marketing (3 autos)' },
      2: { count: 3, descripcion: '1A, 1B, 1C · Marketing (3 autos)' },
      3: { count: 3, descripcion: '1A, 1B, 1C · Marketing (3 autos)' },
      4: { count: 3, descripcion: '1A, 1B, 1C · Marketing (3 autos)' },
      5: { count: 3, descripcion: '1A, 1B, 1C · Marketing (3 autos)' },
    },
  },
  {
    formato: 'pov_gancho',
    label: 'POV 3 Ganchos',
    porDia: {
      1: { count: 3, descripcion: 'Vanessa, Felipe, Xavier (3 videos)' },
      2: { count: 3, descripcion: 'Vanessa, Felipe, Xavier (3 videos)' },
      3: { count: 3, descripcion: 'Vanessa, Felipe, Xavier (3 videos)' },
      4: { count: 3, descripcion: 'Vanessa, Felipe, Xavier (3 videos)' },
      5: { count: 3, descripcion: 'Vanessa, Felipe, Xavier (3 videos)' },
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
      1: { count: 1, descripcion: 'Con Vanessa' },
      3: { count: 1, descripcion: 'Con Felipe' },
      5: { count: 1, descripcion: 'Con Xavier' },
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
]

/** Orden de columnas para mostrar (Lunes..Domingo), igual a la tabla del negocio. */
export const CRONOGRAMA_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

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

/** Qué formatos corresponde asignar/generar para una fecha, según el día de la semana. */
export function getReelCronogramaDelDia(fechaYmd: string): ReelCronogramaEsperado[] {
  const weekday = getDay(new Date(`${fechaYmd}T12:00:00`))
  const result: ReelCronogramaEsperado[] = []
  for (const row of REEL_CRONOGRAMA) {
    const slot = row.porDia[weekday]
    if (slot) {
      result.push({ formato: row.formato, label: row.label, descripcion: slot.descripcion, count: slot.count })
    }
  }
  return result
}
