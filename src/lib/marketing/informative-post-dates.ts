import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ecuadorCalendarParts,
  ecuadorLocalInputToIso,
  formatEcuador,
} from '@/lib/marketing-planner/timezone'

export type InformativePostDateFields = {
  status: string | null
  published_at?: string | null
  scheduled_for: string | null
  created_at: string | null
}

/** Instantáneo usado para ordenar y agrupar (Ecuador). */
export function getPostDisplayIso(post: InformativePostDateFields): string | null {
  const isPublished = (post.status ?? '').toLowerCase() === 'published'
  if (isPublished) {
    return post.published_at || post.scheduled_for || post.created_at
  }
  return post.created_at || post.scheduled_for
}

export function getPostSortTime(post: InformativePostDateFields): number {
  const iso = getPostDisplayIso(post)
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Clave `yyyy-MM-dd` en calendario America/Guayaquil. */
export function getPostDayKeyEcuador(post: InformativePostDateFields): string {
  const iso = getPostDisplayIso(post)
  if (!iso) return 'sin-fecha'
  const p = ecuadorCalendarParts(new Date(iso))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${pad(p.m)}-${pad(p.day)}`
}

export function formatPostDayHeader(dayKey: string): string {
  if (dayKey === 'sin-fecha') return 'Sin fecha'
  try {
    return formatEcuador(ecuadorLocalInputToIso(`${dayKey}T12:00`), 'EEEE dd/MM/yyyy')
  } catch {
    return dayKey
  }
}

export function formatPostInstantEcuador(
  iso: string | null | undefined,
  pattern = "dd/MM/yyyy '•' HH:mm"
): string | null {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return null
  try {
    return formatEcuador(iso, pattern)
  } catch {
    return format(new Date(iso), pattern, { locale: es })
  }
}

export function isPostPublished(post: InformativePostDateFields): boolean {
  return (post.status ?? '').toLowerCase() === 'published'
}
