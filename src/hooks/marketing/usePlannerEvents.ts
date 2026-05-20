'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import { plannerFrom } from '@/lib/marketing-planner/db'
import type { PlannerEvent, PlannerEventType, PlannerVisibility } from '@/types/marketing-planner'

const EVENT_SELECT = `
  *,
  owner:profiles!marketing_planner_events_owner_id_fkey(id, full_name),
  creator:profiles!marketing_planner_events_created_by_fkey(id, full_name),
  inventory:inventoryoracle(id, brand, model, year),
  event_vehicles:marketing_planner_event_vehicles(
    inventory_id,
    inventory:inventoryoracle(id, brand, model, year, version, price)
  )
`

export type PlannerEventInput = {
  title: string
  description?: string | null
  event_type: PlannerEventType
  start_at: string
  end_at: string
  all_day?: boolean
  location?: string | null
  color?: string
  status?: PlannerEvent['status']
  visibility?: PlannerVisibility
  inventory_id?: string | null
  video_plan_item_id?: string | null
  owner_id?: string
}

export function usePlannerEvents(range: { from: string; to: string }) {
  const { supabase, user } = useAuth()
  const { matchesMemberFilter, refreshKey, bumpRefresh } = useMarketingPlannerContext()
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await plannerFrom(supabase, 'marketing_planner_events')
      .select(EVENT_SELECT)
      .lte('start_at', range.to)
      .gte('end_at', range.from)
      .order('start_at', { ascending: true })

    if (error) {
      console.error('[planner events]', error)
      setEvents([])
    } else {
      const rows = (data ?? []) as PlannerEvent[]
      setEvents(rows.filter((e) => matchesMemberFilter(e.owner_id, e.created_by)))
    }
    setLoading(false)
  }, [supabase, range.from, range.to, matchesMemberFilter])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents, refreshKey])

  const createEvent = useCallback(
    async (input: PlannerEventInput) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      const payload = {
        ...input,
        owner_id: input.owner_id ?? user.id,
        created_by: user.id,
      }
      const { data, error } = await plannerFrom(supabase, 'marketing_planner_events')
        .insert(payload)
        .select('id')
        .single()
      if (!error) bumpRefresh()
      return { error: error?.message, id: data?.id as string | undefined }
    },
    [supabase, user, bumpRefresh],
  )

  const updateEvent = useCallback(
    async (id: string, input: Partial<PlannerEventInput>) => {
      if (!supabase) return { error: 'Sin sesión' }
      const { error } = await plannerFrom(supabase, 'marketing_planner_events').update(input).eq('id', id)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, bumpRefresh],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!supabase) return { error: 'Sin sesión' }
      const { error } = await plannerFrom(supabase, 'marketing_planner_events').delete().eq('id', id)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, bumpRefresh],
  )

  const filteredByType = useMemo(
    () => ({
      all: events,
      event: events.filter((e) => e.event_type === 'event'),
      meeting: events.filter((e) => e.event_type === 'meeting'),
      task_reminder: events.filter((e) => e.event_type === 'task_reminder'),
      content: events.filter((e) => e.event_type === 'content'),
    }),
    [events],
  )

  return { events, filteredByType, loading, createEvent, updateEvent, deleteEvent, refetch: fetchEvents }
}
