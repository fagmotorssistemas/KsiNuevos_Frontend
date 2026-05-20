'use client'

import { useMemo } from 'react'
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { PlannerEvent } from '@/types/marketing-planner'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import {
  ecuadorCalendarParts,
  formatEcuador,
  minutesFromMidnightEcuador,
  nowMinutesEcuador,
} from '@/lib/marketing-planner/timezone'

const HOUR_START = 7
const HOUR_END = 21
const SLOT_HEIGHT = 48

type Props = {
  anchor: Date
  events: PlannerEvent[]
  onSlotClick: (day: Date, hour: number) => void
  onEventClick: (event: PlannerEvent) => void
}

export function WeekCalendarGrid({ anchor, events, onSlotClick, onEventClick }: Props) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    [],
  )

  const todayParts = ecuadorCalendarParts()
  const todayLocal = new Date(todayParts.y, todayParts.m - 1, todayParts.day)
  const nowMin = nowMinutesEcuador()

  function eventsForDay(day: Date) {
    return events.filter((ev) => {
      const p = ecuadorCalendarParts(new Date(ev.start_at))
      const d = new Date(p.y, p.m - 1, p.day)
      return isSameDay(d, day)
    })
  }

  function layoutDay(dayEvents: PlannerEvent[]) {
    const sorted = [...dayEvents].sort(
      (a, b) => minutesFromMidnightEcuador(a.start_at) - minutesFromMidnightEcuador(b.start_at),
    )
    const cols: PlannerEvent[][] = []
    for (const ev of sorted) {
      const start = minutesFromMidnightEcuador(ev.start_at)
      const end = minutesFromMidnightEcuador(ev.end_at)
      let placed = false
      for (const col of cols) {
        const last = col[col.length - 1]
        if (minutesFromMidnightEcuador(last.end_at) <= start) {
          col.push(ev)
          placed = true
          break
        }
      }
      if (!placed) cols.push([ev])
    }
    const colIndex = new Map<string, { col: number; total: number }>()
    cols.forEach((col, ci) => {
      col.forEach((ev) => colIndex.set(ev.id, { col: ci, total: cols.length }))
    })
    return sorted.map((ev) => {
      const start = minutesFromMidnightEcuador(ev.start_at)
      const end = minutesFromMidnightEcuador(ev.end_at)
      const top = ((start - HOUR_START * 60) / 60) * SLOT_HEIGHT
      const height = Math.max(((end - start) / 60) * SLOT_HEIGHT, 24)
      const idx = colIndex.get(ev.id) ?? { col: 0, total: 1 }
      const widthPct = 100 / idx.total
      const leftPct = idx.col * widthPct
      return { ev, top, height, widthPct, leftPct }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/80">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, todayLocal)
          return (
            <div
              key={d.toISOString()}
              className={`py-3 text-center border-l border-slate-100 ${isToday ? 'bg-violet-50/60' : ''}`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {format(d, 'EEE', { locale: es })}
              </p>
              <p className={`text-lg font-bold ${isToday ? 'text-violet-700' : 'text-slate-800'}`}>
                {format(d, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[56px_repeat(7,1fr)] max-h-[640px] overflow-y-auto">
        <div className="relative border-r border-slate-100">
          {hours.map((h) => (
            <div
              key={h}
              className="text-[10px] text-slate-400 font-medium pr-2 text-right border-b border-dashed border-slate-100"
              style={{ height: SLOT_HEIGHT }}
            >
              {h <= 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const isToday = isSameDay(day, todayLocal)
          const laid = layoutDay(eventsForDay(day))
          return (
            <div
              key={day.toISOString()}
              className={`relative border-l border-slate-100 ${isToday ? 'bg-violet-50/30' : ''}`}
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="w-full border-b border-dashed border-slate-100 hover:bg-violet-50/40 transition-colors"
                  style={{ height: SLOT_HEIGHT }}
                  onClick={() => onSlotClick(day, h)}
                  aria-label={`Crear evento ${format(day, 'd MMM')} ${h}:00`}
                />
              ))}

              {isToday && nowMin >= HOUR_START * 60 && nowMin <= HOUR_END * 60 && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: ((nowMin - HOUR_START * 60) / 60) * SLOT_HEIGHT }}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1" />
                  <div className="flex-1 h-0.5 bg-blue-500" />
                </div>
              )}

              {laid.map(({ ev, top, height, widthPct, leftPct }) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="absolute z-10 rounded-lg px-2 py-1 text-left overflow-hidden shadow-sm border-l-4 hover:brightness-95 transition-all"
                  style={{
                    top,
                    height,
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    backgroundColor: `${ev.color}22`,
                    borderLeftColor: ev.color,
                  }}
                >
                  <p className="text-[10px] font-semibold text-slate-600 truncate">
                    {formatEcuador(ev.start_at, 'h:mm a')} – {formatEcuador(ev.end_at, 'h:mm a')}
                  </p>
                  <p className="text-xs font-bold text-slate-800 truncate">{ev.title}</p>
                  <div className="mt-0.5 scale-90 origin-left">
                    <OwnerBadge owner={ev.owner} creator={ev.creator} />
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
