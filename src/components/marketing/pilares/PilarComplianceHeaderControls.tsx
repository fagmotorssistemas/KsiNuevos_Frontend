'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react'
import { ecuadorCalendarParts } from '@/lib/marketing-planner/timezone'
import type { PilarDayCompliance } from '@/lib/marketing/pilar-compliance'

function ymd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function percentTone(p: number | null | undefined, applicable: boolean) {
  if (!applicable || p == null) return 'text-slate-400'
  if (p >= 80) return 'text-emerald-700'
  if (p >= 50) return 'text-amber-700'
  return 'text-rose-700'
}

function percentBg(p: number | null | undefined, applicable: boolean, selected: boolean) {
  if (selected) return 'bg-slate-900 text-white hover:bg-slate-800'
  if (!applicable || p == null) return 'text-slate-700 hover:bg-slate-50'
  if (p >= 80) return 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
  if (p >= 50) return 'bg-amber-50 text-amber-900 hover:bg-amber-100'
  return 'bg-rose-50 text-rose-900 hover:bg-rose-100'
}

export function PilarComplianceHeaderControls({
  fecha,
  onSelectFecha,
  refreshKey = 0,
}: {
  fecha: string
  onSelectFecha: (next: string) => void
  /** Incrementar tras generar guiones / refrescar plan para recalcular %. */
  refreshKey?: number
}) {
  const [day, setDay] = useState<PilarDayCompliance | null>(null)
  const [loadingDay, setLoadingDay] = useState(false)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = fecha.split('-').map(Number)
    return new Date(y, m - 1, 1)
  })
  const [monthDays, setMonthDays] = useState<Record<string, PilarDayCompliance>>({})
  const [loadingMonth, setLoadingMonth] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const [y, m] = fecha.split('-').map(Number)
    setAnchor(new Date(y, m - 1, 1))
  }, [fecha])

  useEffect(() => {
    let cancelled = false
    setLoadingDay(true)
    void (async () => {
      try {
        const res = await fetch(
          `/api/pilares/compliance?fecha=${encodeURIComponent(fecha)}&recompute=1`,
          { credentials: 'include', cache: 'no-store' }
        )
        const data = (await res.json()) as { day?: PilarDayCompliance; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Error')
        if (!cancelled) setDay(data.day ?? null)
      } catch {
        if (!cancelled) setDay(null)
      } finally {
        if (!cancelled) setLoadingDay(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fecha, refreshKey])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const monthKey = format(anchor, 'yyyy-MM')
    setLoadingMonth(true)
    void (async () => {
      try {
        const res = await fetch(
          `/api/pilares/compliance?month=${encodeURIComponent(monthKey)}`,
          { credentials: 'include', cache: 'no-store' }
        )
        const data = (await res.json()) as {
          days?: PilarDayCompliance[]
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Error')
        if (cancelled) return
        const map: Record<string, PilarDayCompliance> = {}
        for (const d of data.days ?? []) map[d.fecha] = d
        setMonthDays(map)
      } catch {
        if (!cancelled) setMonthDays({})
      } finally {
        if (!cancelled) setLoadingMonth(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectedDate = useMemo(() => {
    const [y, m, d] = fecha.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [fecha])

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(anchor)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [anchor])

  const todayParts = ecuadorCalendarParts()
  const today = new Date(todayParts.y, todayParts.m - 1, todayParts.day)

  async function handleRecompute() {
    setLoadingDay(true)
    try {
      const res = await fetch('/api/pilares/compliance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha }),
      })
      const data = (await res.json()) as { day?: PilarDayCompliance; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setDay(data.day ?? null)
      if (data.day) {
        setMonthDays((prev) => ({ ...prev, [data.day!.fecha]: data.day! }))
      }
    } catch {
      /* toast handled by silent fail; badge stays */
    } finally {
      setLoadingDay(false)
    }
  }

  const pct = day?.applicable ? day.percent : null

  return (
    <div className="relative flex flex-wrap items-center gap-2" ref={popoverRef}>
      <div
        className={[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold',
          day?.applicable
            ? pct != null && pct >= 80
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : pct != null && pct >= 50
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-gray-200 bg-gray-50 text-gray-600',
        ].join(' ')}
        title={
          day?.applicable
            ? `Videos del día ${day.videoEvidenceCount}/${day.expectedCount}`
            : 'Sin piezas en el cronograma para este día'
        }
      >
        {loadingDay ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className={percentTone(pct, !!day?.applicable)}>
            {day?.applicable ? `${Math.round(day.percent)}%` : '—'}
          </span>
        )}
        <span className="font-semibold text-xs opacity-80">cumplimiento</span>
      </div>

      <button
        type="button"
        onClick={() => void handleRecompute()}
        disabled={loadingDay}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title="Recalcular cumplimiento del día"
      >
        <RefreshCw className={`h-4 w-4 ${loadingDay ? 'animate-spin' : ''}`} />
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'inline-flex items-center justify-center w-9 h-9 rounded-xl border text-gray-700',
          open
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-gray-200 bg-white hover:bg-gray-50',
        ].join(' ')}
        title="Calendario de cumplimiento"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAnchor((a) => addMonths(a, -1))}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-extrabold text-slate-900 capitalize min-w-[8.5rem] text-center">
                {format(anchor, 'MMMM yyyy', { locale: es })}
              </p>
              <button
                type="button"
                onClick={() => setAnchor((a) => addMonths(a, 1))}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold text-slate-400 uppercase py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {loadingMonth ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((dayCell) => {
                const key = ymd(dayCell)
                const stored = monthDays[key]
                const inMonth = isSameMonth(dayCell, anchor)
                const isToday = isSameDay(dayCell, today)
                const selected = isSameDay(dayCell, selectedDate)
                const p = stored?.applicable ? stored.percent : null

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSelectFecha(key)
                      setOpen(false)
                    }}
                    className={[
                      'aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-all',
                      !inMonth && 'opacity-35',
                      percentBg(p, !!stored?.applicable, selected),
                      isToday && !selected && 'ring-2 ring-violet-400',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span>{format(dayCell, 'd')}</span>
                    <span
                      className={`text-[9px] font-bold leading-none ${
                        selected
                          ? 'text-white/90'
                          : percentTone(p, !!stored?.applicable)
                      }`}
                    >
                      {stored?.applicable ? `${Math.round(stored.percent)}%` : '·'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <p className="mt-3 text-[10px] text-slate-400 leading-snug">
            % = videos subidos ese día (Biblioteca bruto o Videos) / piezas del
            cronograma. Desde el 5 ago 2026.
          </p>
        </div>
      ) : null}
    </div>
  )
}
