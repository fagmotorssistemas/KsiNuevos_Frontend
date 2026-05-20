import type { PlannerEvent } from '@/types/marketing-planner'
import { PLANNER_EVENT_COLORS } from '@/types/marketing-planner'
import type { PlannerEventInput } from '@/hooks/marketing/usePlannerEvents'
import { ecuadorLocalInputToIso, toEcuadorLocalInputValue } from '@/lib/marketing-planner/timezone'
import type { EventFormState } from '@/components/marketing/planificador/modals/events/EventFormFields'

export function getEventInventoryIds(event: PlannerEvent): string[] {
  if (event.event_vehicles?.length) {
    return event.event_vehicles.map((ev) => ev.inventory_id)
  }
  return event.inventory_id ? [event.inventory_id] : []
}

export function emptyEventForm(defaultStart?: string, defaultEnd?: string, ownerId?: string): EventFormState {
  const start = defaultStart ?? new Date().toISOString()
  const end = defaultEnd ?? new Date(Date.now() + 3600000).toISOString()
  return {
    title: '',
    description: '',
    eventType: 'event',
    startLocal: toEcuadorLocalInputValue(start),
    endLocal: toEcuadorLocalInputValue(end),
    allDay: false,
    location: '',
    visibility: 'personal',
    status: 'scheduled',
    inventoryIds: [],
    ownerId: ownerId ?? '',
  }
}

export function eventToForm(event: PlannerEvent): EventFormState {
  return {
    title: event.title,
    description: event.description ?? '',
    eventType: event.event_type,
    startLocal: toEcuadorLocalInputValue(event.start_at),
    endLocal: toEcuadorLocalInputValue(event.end_at),
    allDay: event.all_day,
    location: event.location ?? '',
    visibility: event.visibility,
    status: event.status,
    inventoryIds: getEventInventoryIds(event),
    ownerId: event.owner_id,
  }
}

export function formToEventInput(form: EventFormState, isAdmin: boolean): PlannerEventInput {
  const ids = form.inventoryIds
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    event_type: form.eventType,
    start_at: ecuadorLocalInputToIso(form.startLocal),
    end_at: ecuadorLocalInputToIso(form.endLocal),
    all_day: form.allDay,
    location: form.location.trim() || null,
    visibility: form.visibility,
    status: form.status,
    color: PLANNER_EVENT_COLORS[form.eventType],
    inventory_id: ids[0] ?? null,
    owner_id: isAdmin && form.ownerId ? form.ownerId : undefined,
  }
}
