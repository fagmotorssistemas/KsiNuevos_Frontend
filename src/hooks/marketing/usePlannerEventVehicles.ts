'use client'

import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import { plannerFrom } from '@/lib/marketing-planner/db'

export function usePlannerEventVehicles() {
  const { supabase } = useAuth()
  const { bumpRefresh } = useMarketingPlannerContext()

  const fetchVehicleIdsForEvent = useCallback(
    async (eventId: string) => {
      if (!supabase) return [] as string[]
      const { data, error } = await plannerFrom(supabase, 'marketing_planner_event_vehicles')
        .select('inventory_id')
        .eq('event_id', eventId)
      if (error) {
        console.error('[event vehicles]', error)
        return []
      }
      return (data ?? []).map((r: { inventory_id: string }) => r.inventory_id)
    },
    [supabase],
  )

  const syncEventVehicles = useCallback(
    async (eventId: string, inventoryIds: string[]) => {
      if (!supabase) return { error: 'Sin sesión' }
      const { error: delErr } = await plannerFrom(supabase, 'marketing_planner_event_vehicles')
        .delete()
        .eq('event_id', eventId)
      if (delErr) return { error: delErr.message }

      const unique = [...new Set(inventoryIds.filter(Boolean))]
      if (unique.length > 0) {
        const { error: insErr } = await plannerFrom(supabase, 'marketing_planner_event_vehicles').insert(
          unique.map((inventory_id) => ({ event_id: eventId, inventory_id })),
        )
        if (insErr) return { error: insErr.message }
      }

      const { error: upErr } = await plannerFrom(supabase, 'marketing_planner_events')
        .update({ inventory_id: unique[0] ?? null })
        .eq('id', eventId)
      if (upErr) return { error: upErr.message }

      bumpRefresh()
      return { error: undefined }
    },
    [supabase, bumpRefresh],
  )

  return { fetchVehicleIdsForEvent, syncEventVehicles }
}
