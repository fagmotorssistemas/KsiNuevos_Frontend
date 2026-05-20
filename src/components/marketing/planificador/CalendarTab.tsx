'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Star,
  Video,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { usePlannerEvents, type PlannerEventInput } from '@/hooks/marketing/usePlannerEvents'
import type { CalendarView, PlannerEvent } from '@/types/marketing-planner'
import {
  ecuadorLocalInputToIso,
  formatEcuador,
  getDayRange,
  getMonthRange,
  getWeekRange,
  rangeToIsoQuery,
  shiftCalendarAnchor,
} from '@/lib/marketing-planner/timezone'
import { WeekCalendarGrid } from '@/components/marketing/planificador/WeekCalendarGrid'
import { MonthCalendarGrid } from '@/components/marketing/planificador/MonthCalendarGrid'
import { OwnerBadge } from '@/components/marketing/planificador/ui/OwnerBadge'
import { PlannerConfirmDialog } from '@/components/marketing/planificador/ui/PlannerConfirmDialog'
import { EventCreateModal } from '@/components/marketing/planificador/modals/events/EventCreateModal'
import { EventEditModal } from '@/components/marketing/planificador/modals/events/EventEditModal'
import { EventViewModal } from '@/components/marketing/planificador/modals/events/EventViewModal'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'

type CalFilter = 'all' | 'event' | 'meeting' | 'task_reminder' | 'content'

const FILTERS: { id: CalFilter; label: string; icon: typeof Star }[] = [
  { id: 'all', label: 'Todo programado', icon: Calendar },
  { id: 'event', label: 'Eventos', icon: Star },
  { id: 'meeting', label: 'Reuniones', icon: Video },
  { id: 'task_reminder', label: 'Recordatorios', icon: ClipboardList },
  { id: 'content', label: 'Contenido', icon: Filter },
]

export function CalendarTab() {
  const { focusEventId, clearFocusEvent } = useMarketingPlannerContext()
  const [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>('week')
  const [calFilter, setCalFilter] = useState<CalFilter>('all')
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [viewEvent, setViewEvent] = useState<PlannerEvent | null>(null)
  const [editEvent, setEditEvent] = useState<PlannerEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannerEvent | null>(null)
  const [draftStart, setDraftStart] = useState<string | undefined>()
  const [draftEnd, setDraftEnd] = useState<string | undefined>()
  const [deleting, setDeleting] = useState(false)

  const range = useMemo(() => {
    if (view === 'day') return getDayRange(anchor)
    if (view === 'month') return getMonthRange(anchor)
    return getWeekRange(anchor)
  }, [anchor, view])

  const { from, to } = rangeToIsoQuery(range.start, range.end)
  const { events, filteredByType, loading, createEvent, updateEvent, deleteEvent } =
    usePlannerEvents({ from, to })

  useEffect(() => {
    if (!focusEventId || loading) return
    const ev = events.find((e) => e.id === focusEventId)
    if (ev) {
      setViewEvent(ev)
      clearFocusEvent()
    }
  }, [focusEventId, events, loading, clearFocusEvent])

  const displayed = useMemo(() => {
    const base = calFilter === 'all' ? events : filteredByType[calFilter]
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q),
    )
  }, [events, filteredByType, calFilter, search])

  const rangeLabel = useMemo(() => {
    if (view === 'week') {
      return `${format(range.start, 'd MMM', { locale: es })} – ${format(range.end, 'd MMM yyyy', { locale: es })}`
    }
    if (view === 'month') return format(anchor, 'MMMM yyyy', { locale: es })
    return format(anchor, "EEEE d 'de' MMMM", { locale: es })
  }, [view, anchor, range])

  function openCreate(start?: string, end?: string) {
    setDraftStart(start)
    setDraftEnd(end)
    setCreateOpen(true)
  }

  function slotToIso(day: Date, hour: number) {
    const ymd = format(day, 'yyyy-MM-dd')
    const start = ecuadorLocalInputToIso(`${ymd}T${String(hour).padStart(2, '0')}:00`)
    const end = ecuadorLocalInputToIso(`${ymd}T${String(hour + 1).padStart(2, '0')}:00`)
    return { start, end }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteEvent(deleteTarget.id)
    setDeleting(false)
    if (error) toast.error(error)
    else {
      toast.success('Evento eliminado')
      setDeleteTarget(null)
      setEditEvent(null)
      setViewEvent(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCalFilter(id)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                calFilter === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="pl-9 w-44 rounded-xl border-slate-200 h-10"
            />
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900 capitalize">{rangeLabel}</h3>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAnchor((a) => shiftCalendarAnchor(a, view, -1))} className="p-2 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setAnchor((a) => shiftCalendarAnchor(a, view, 1))} className="p-2 rounded-lg hover:bg-slate-100">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="flex rounded-xl bg-slate-100 p-1 ml-2">
            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-bold capitalize',
                  view === v ? 'bg-white shadow text-slate-900' : 'text-slate-500',
                ].join(' ')}
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      ) : view === 'week' ? (
        <WeekCalendarGrid
          anchor={anchor}
          events={displayed}
          onSlotClick={(day, hour) => {
            const { start, end } = slotToIso(day, hour)
            openCreate(start, end)
          }}
          onEventClick={setViewEvent}
        />
      ) : view === 'month' ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <MonthCalendarGrid anchor={anchor} events={displayed} selectedDay={anchor} onSelectDay={setAnchor} />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 max-h-[420px] overflow-y-auto">
            <p className="text-sm font-bold text-slate-800 mb-2">Eventos del día</p>
            {displayed
              .filter((e) => format(new Date(e.start_at), 'yyyy-MM-dd') === format(anchor, 'yyyy-MM-dd'))
              .map((e) => (
                <EventListCard key={e.id} event={e} onClick={() => setViewEvent(e)} />
              ))}
            {displayed.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Sin eventos en este rango</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          {displayed.map((e) => (
            <EventListCard key={e.id} event={e} onClick={() => setViewEvent(e)} />
          ))}
          {displayed.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-12">Sin eventos este día</p>
          )}
        </div>
      )}

      <EventCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultStart={draftStart}
        defaultEnd={draftEnd}
        onSave={async (input) => {
          const res = await createEvent(input)
          if (res.error) toast.error(res.error)
          else if (!res.id) toast.success('Evento creado')
          return res
        }}
      />

      {viewEvent && (
        <EventViewModal
          open={!!viewEvent}
          onClose={() => setViewEvent(null)}
          event={viewEvent}
          onEdit={() => {
            setEditEvent(viewEvent)
            setViewEvent(null)
          }}
        />
      )}

      {editEvent && (
        <EventEditModal
          open={!!editEvent}
          onClose={() => setEditEvent(null)}
          event={editEvent}
          onSave={async (input) => {
            const res = await updateEvent(editEvent.id, input)
            if (res.error) toast.error(res.error)
            else toast.success('Evento actualizado')
            return res
          }}
          onDelete={() => setDeleteTarget(editEvent)}
        />
      )}

      <PlannerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar evento"
        message={`¿Eliminar "${deleteTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  )
}

function EventListCard({ event, onClick }: { event: PlannerEvent; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-slate-50/50 transition-colors"
      style={{ borderLeftWidth: 4, borderLeftColor: event.color }}
    >
      <p className="text-xs text-slate-500">
        {formatEcuador(event.start_at, 'HH:mm')} – {formatEcuador(event.end_at, 'HH:mm')}
      </p>
      <p className="font-semibold text-slate-800">{event.title}</p>
      <div className="mt-1.5">
        <OwnerBadge owner={event.owner} creator={event.creator} showCreatorIfDifferent />
      </div>
    </button>
  )
}
