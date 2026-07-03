'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { GuionesAssignmentSlotModal } from '@/components/marketing/GuionesAssignmentSlotModal'
import type { MonthOverviewItem } from '@/types/script-assignment'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type GuionesMonthCalendarProps = {
  mes: string
  items: MonthOverviewItem[]
  loading: boolean
  onMesChange: (mes: string) => void
  onSelectDay: (fecha: string) => void
  onReload?: () => void
}

function parseMes(mes: string): Date {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y!, m! - 1, 1, 12)
}

function toMesString(d: Date): string {
  return format(d, 'yyyy-MM')
}

function slotKey(item: MonthOverviewItem) {
  return `${item.assignment_id}-${item.slot_tipo}-${item.fecha}`
}

export function GuionesMonthCalendar({
  mes,
  items,
  loading,
  onMesChange,
  onSelectDay,
  onReload,
}: GuionesMonthCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<MonthOverviewItem | null>(null)
  const monthDate = useMemo(() => parseMes(mes), [mes])

  const byDate = useMemo(() => {
    const map = new Map<string, MonthOverviewItem[]>()
    for (const item of items) {
      const list = map.get(item.fecha) ?? []
      list.push(item)
      map.set(item.fecha, list)
    }
    return map
  }, [items])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [monthDate])

  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es })
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const stats = useMemo(() => {
    const uniqueAssignments = new Set(items.map((i) => i.assignment_id))
    const generated = new Set(
      items.filter((i) => i.guion_generado).map((i) => i.assignment_id)
    )
    const reelsDone = new Set(
      items.filter((i) => i.reel_cumplido).map((i) => i.assignment_id)
    )
    const total = uniqueAssignments.size
    const generatedCount = generated.size
    const reelCount = reelsDone.size
    return {
      total,
      generated: generatedCount,
      reels: reelCount,
      pending: total - reelCount,
    }
  }, [items])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 leading-relaxed">
        <strong>Reel cumplido</strong> se detecta automáticamente al subir el video en{' '}
        <strong>Marketing → Videos</strong> (mismo vehículo y misma fecha). Los ajustes manuales
        de reprogramación dependen del usuario que los registra y requieren justificante.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMesChange(toMesString(addMonths(monthDate, -1)))}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-extrabold text-gray-900 min-w-[10rem] text-center capitalize">
            {capitalizedMonth}
          </h2>
          <button
            type="button"
            onClick={() => onMesChange(toMesString(addMonths(monthDate, 1)))}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
            {stats.total} carros
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800">
            {stats.generated} guiones
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800">
            {stats.reels} reels
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800">
            {stats.pending} pendientes
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-[11px] font-extrabold uppercase tracking-wide text-gray-500"
            >
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando mes…
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-auto">
            {calendarDays.map((day) => {
              const fecha = format(day, 'yyyy-MM-dd')
              const cars = byDate.get(fecha) ?? []
              const inMonth = isSameMonth(day, monthDate)
              const isToday = fecha === format(new Date(), 'yyyy-MM-dd')

              return (
                <button
                  key={fecha}
                  type="button"
                  onClick={() => cars.length > 0 && onSelectDay(fecha)}
                  disabled={cars.length === 0}
                  className={[
                    'border-b border-r border-gray-100 p-3 text-left transition-colors flex flex-col gap-2 align-top',
                    cars.length > 0 ? 'min-h-[120px]' : 'min-h-[72px]',
                    inMonth ? 'bg-white' : 'bg-gray-50/80',
                    cars.length > 0 ? 'hover:bg-violet-50/40 cursor-pointer' : 'cursor-default',
                    isToday ? 'ring-1 ring-inset ring-violet-300' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-sm font-extrabold w-7 h-7 flex items-center justify-center rounded-full shrink-0',
                      isToday ? 'bg-violet-700 text-white' : inMonth ? 'text-gray-800' : 'text-gray-400',
                    ].join(' ')}
                  >
                    {format(day, 'd')}
                  </span>

                  {cars.length > 0 && (
                    <ul className="space-y-1.5 w-full">
                      {cars.map((car) => {
                        const dotClass = car.reel_cumplido
                          ? 'bg-violet-600'
                          : car.guion_generado
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'

                        return (
                          <li
                            key={slotKey(car)}
                            className={[
                              'flex items-start gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                              car.sombreado
                                ? 'bg-gray-200/70 border-gray-200 opacity-75'
                                : 'bg-gray-50/90 border-gray-100 hover:border-violet-200 hover:bg-violet-50/50',
                              car.readonly ? 'border-dashed' : '',
                            ].join(' ')}
                          >
                            <button
                              type="button"
                              className="flex items-start gap-2 w-full text-left min-w-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSlot(car)
                              }}
                            >
                              <span
                                className={[
                                  'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                                  dotClass,
                                ].join(' ')}
                                title={
                                  car.reel_cumplido
                                    ? 'Reel subido'
                                    : car.guion_generado
                                      ? 'Guión generado'
                                      : 'Pendiente'
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={[
                                    'text-xs leading-snug font-semibold break-words block',
                                    car.sombreado ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-800',
                                  ].join(' ')}
                                >
                                  {car.vehicle_label}
                                </span>
                                {car.slot_tipo === 'reprogramado' && (
                                  <span className="text-[10px] font-bold text-violet-700">
                                    ↪ reprogramado
                                  </span>
                                )}
                                {car.readonly && (
                                  <span className="text-[10px] font-bold text-gray-400"> histórico</span>
                                )}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-600" />
          Reel subido (cumplido)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Guión generado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Pendiente
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-5 w-8 rounded bg-gray-200/80 border border-gray-200" />
          No grabado (día original)
        </span>
        <span className="text-gray-400">
          Clic en el día abre la vista del día · clic en el carro abre detalle / reprogramar
        </span>
      </div>

      <GuionesAssignmentSlotModal
        item={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onRescheduled={() => onReload?.()}
      />
    </div>
  )
}
