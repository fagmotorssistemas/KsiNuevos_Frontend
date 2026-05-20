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
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { PlannerField } from '@/components/marketing/planificador/ui/PlannerForm'
import {
  ecuadorCalendarParts,
  formatLocalDateTimePreview,
  joinLocalDateTime,
  splitLocalDateTime,
} from '@/lib/marketing-planner/timezone'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: pad2(i),
  label: pad2(i),
}))

const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((m) => ({ value: m, label: m }))

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function SelectBox({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={twMerge('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90" />
    </div>
  )
}

function MiniCalendar({
  selectedYmd,
  onSelect,
}: {
  selectedYmd: string
  onSelect: (ymd: string) => void
}) {
  const selected = selectedYmd ? parseISO(`${selectedYmd}T12:00:00`) : new Date()
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected))

  const todayParts = ecuadorCalendarParts()
  const today = new Date(todayParts.y, todayParts.m - 1, todayParts.day)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [viewMonth])

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const ymd = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, viewMonth)
          const isToday = isSameDay(day, today)
          const isSelected = selectedYmd === ymd
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelect(ymd)}
              className={twMerge(
                'aspect-square rounded-lg text-sm font-semibold transition-colors',
                !inMonth && 'text-slate-300',
                inMonth && !isSelected && 'text-slate-700 hover:bg-violet-50',
                isToday && !isSelected && 'ring-1 ring-violet-300',
                isSelected && 'bg-violet-600 text-white hover:bg-violet-700',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type PlannerDateTimeFieldProps = {
  label: string
  value: string
  onChange: (local: string) => void
  required?: boolean
  hint?: string
  dateOnly?: boolean
  allowClear?: boolean
  emptyPreview?: string
}

export function PlannerDateTimeField({
  label,
  value,
  onChange,
  required,
  hint,
  dateOnly = false,
  allowClear = false,
  emptyPreview = 'Sin fecha',
}: PlannerDateTimeFieldProps) {
  const { dateYmd, timeHm } = splitLocalDateTime(value)
  const [hour, minute] = timeHm.split(':')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function patchDate(ymd: string) {
    onChange(dateOnly ? joinLocalDateTime(ymd, '00:00') : joinLocalDateTime(ymd, timeHm))
    setCalendarOpen(false)
  }

  function patchTime(h: string, m: string) {
    onChange(joinLocalDateTime(dateYmd, `${h}:${m}`))
  }

  const dateButtonLabel = dateYmd
    ? format(parseISO(`${dateYmd}T12:00:00`), "EEE d MMM yyyy", { locale: es })
    : 'Elegir fecha'

  return (
    <PlannerField label={label} hint={hint} required={required}>
      <div
        ref={wrapRef}
        className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3"
      >
        <div className={twMerge('grid gap-3', dateOnly ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[1fr_auto]')}>
          <div className="relative">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-violet-600" />
              Fecha
            </p>
            <button
              type="button"
              onClick={() => setCalendarOpen((o) => !o)}
              className={twMerge(
                'w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-slate-800',
                'hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
                calendarOpen && 'border-violet-400 ring-2 ring-violet-500/20',
              )}
            >
              <span className="capitalize">{dateButtonLabel}</span>
            </button>
            {calendarOpen && (
              <div className="absolute z-40 top-full left-0 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white shadow-xl">
                <MiniCalendar selectedYmd={dateYmd} onSelect={patchDate} />
              </div>
            )}
          </div>

          {!dateOnly && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-violet-600" />
                Hora
              </p>
              <div className="flex gap-2">
                <SelectBox
                  value={hour}
                  onChange={(h) => patchTime(h, minute)}
                  options={HOUR_OPTIONS}
                  className="w-20"
                />
                <span className="flex items-center text-slate-400 font-bold">:</span>
                <SelectBox
                  value={minute}
                  onChange={(m) => patchTime(hour, m)}
                  options={MINUTE_OPTIONS}
                  className="w-20"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-medium text-violet-800 bg-violet-50/80 rounded-lg px-3 py-2 capitalize">
            {value ? formatLocalDateTimePreview(value, dateOnly) : emptyPreview}
          </p>
          {allowClear && value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="shrink-0 p-2 rounded-lg border border-gray-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Quitar fecha"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </PlannerField>
  )
}
