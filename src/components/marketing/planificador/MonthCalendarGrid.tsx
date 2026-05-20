'use client'

import {
  addDays,
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
import type { PlannerEvent } from '@/types/marketing-planner'
import { ecuadorCalendarParts } from '@/lib/marketing-planner/timezone'

type Props = {
  anchor: Date
  events: PlannerEvent[]
  selectedDay: Date
  onSelectDay: (d: Date) => void
}

export function MonthCalendarGrid({ anchor, events, selectedDay, onSelectDay }: Props) {
  const monthStart = startOfMonth(anchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const todayParts = ecuadorCalendarParts()
  const today = new Date(todayParts.y, todayParts.m - 1, todayParts.day)

  function countEvents(day: Date) {
    return events.filter((ev) => {
      const p = ecuadorCalendarParts(new Date(ev.start_at))
      const d = new Date(p.y, p.m - 1, p.day)
      return isSameDay(d, day)
    }).length
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, anchor)
          const isToday = isSameDay(day, today)
          const selected = isSameDay(day, selectedDay)
          const n = countEvents(day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                'aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-all',
                !inMonth && 'text-slate-300',
                inMonth && 'text-slate-700 hover:bg-slate-50',
                isToday && 'ring-2 ring-violet-400',
                selected && 'bg-slate-900 text-white hover:bg-slate-800',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{format(day, 'd')}</span>
              {n > 0 && (
                <span
                  className={`flex gap-0.5 ${selected ? 'opacity-90' : ''}`}
                >
                  {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-slate-900'}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 text-center">
        {format(anchor, 'MMMM yyyy', { locale: es })}
      </p>
    </div>
  )
}
