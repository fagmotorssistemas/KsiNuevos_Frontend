import { getDay } from 'date-fns'
import type { PilarSistema } from '@/types/pilar'

export type PilarCronogramaSlot = {
  count: number
  descripcion: string
}

export type PilarCronogramaKey = PilarSistema | 'live'

export type PilarCronogramaRow = {
  key: PilarCronogramaKey
  label: string
  /** Clave = día `date-fns getDay` (1=Lun … 5=Vie). */
  porDia: Partial<Record<number, PilarCronogramaSlot>>
  /** Solo referencia visual (Live). No alimenta plan operativo. */
  soloVista?: boolean
}

/**
 * Cronograma semanal (imagen marketing).
 * Mapeo:
 * - VIDEO AUTOS / VIDEO PILAR 1 → pilar1
 * - VIDEO HUMANIZAR MARCA → pilar2
 * - VIDEO EDUCATIVO → pilar3
 * - VIDEO ENTRETENIMIENTO → pilar4
 * - LIVE → solo vista
 */
export const PILAR_CRONOGRAMA: PilarCronogramaRow[] = [
  {
    key: 'pilar1',
    label: 'Video Autos / Pilar 1',
    porDia: {
      1: { count: 2, descripcion: '2 × Video Autos' },
      2: { count: 3, descripcion: '3 × Video Autos' },
      3: { count: 2, descripcion: '2 × Video Autos' },
      4: { count: 2, descripcion: '2 × Video Autos' },
      5: { count: 2, descripcion: '2 × Video Autos' },
    },
  },
  {
    key: 'pilar3',
    label: 'Video Educativo',
    porDia: {
      1: { count: 2, descripcion: '2 × Video Educativo' },
      2: { count: 1, descripcion: '1 × Video Educativo' },
      3: { count: 1, descripcion: '1 × Video Educativo' },
      4: { count: 2, descripcion: '2 × Video Educativo' },
      5: { count: 1, descripcion: '1 × Video Educativo' },
    },
  },
  {
    key: 'pilar4',
    label: 'Video Entretenimiento',
    porDia: {
      1: { count: 1, descripcion: '1 × Video Entretenimiento' },
      2: { count: 1, descripcion: '1 × Video Entretenimiento' },
      3: { count: 2, descripcion: '2 × Video Entretenimiento' },
      4: { count: 1, descripcion: '1 × Video Entretenimiento' },
      5: { count: 1, descripcion: '1 × Video Entretenimiento' },
    },
  },
  {
    key: 'pilar2',
    label: 'Video Humanizar Marca',
    porDia: {
      2: { count: 1, descripcion: '1 × Video Humanizar Marca' },
      5: { count: 1, descripcion: '1 × Video Humanizar Marca' },
    },
  },
  {
    key: 'live',
    label: 'Live',
    soloVista: true,
    porDia: {
      1: { count: 1, descripcion: '1 × Live' },
      3: { count: 1, descripcion: '1 × Live' },
      5: { count: 1, descripcion: '1 × Live' },
    },
  },
]

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

export type PilarCronogramaEsperado = {
  sistema: PilarSistema
  label: string
  descripcion: string
  count: number
}

function isSistema(key: PilarCronogramaKey): key is PilarSistema {
  return key !== 'live'
}

/** Piezas esperadas del día según el cronograma de la imagen (sin Live). */
export function getPilarCronogramaDelDia(fechaYmd: string): PilarCronogramaEsperado[] {
  const weekday = getDay(new Date(`${fechaYmd}T12:00:00`))
  const result: PilarCronogramaEsperado[] = []
  for (const row of PILAR_CRONOGRAMA) {
    if (row.soloVista || !isSistema(row.key)) continue
    const slot = row.porDia[weekday]
    if (slot) {
      result.push({
        sistema: row.key,
        label: row.label,
        descripcion: slot.descripcion,
        count: slot.count,
      })
    }
  }
  return result
}
