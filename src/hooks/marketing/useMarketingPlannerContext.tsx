'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { AdminMemberFilter, MarketingTeamMember, PlannerTab } from '@/types/marketing-planner'

type PlannerContextValue = {
  tab: PlannerTab
  setTab: (t: PlannerTab) => void
  isAdmin: boolean
  isMarketing: boolean
  currentUserId: string | null
  teamMembers: MarketingTeamMember[]
  memberFilter: AdminMemberFilter
  setMemberFilter: (f: AdminMemberFilter) => void
  effectiveOwnerId: string | null
  matchesMemberFilter: (ownerId: string, createdBy: string) => boolean
  refreshKey: number
  bumpRefresh: () => void
  /** Abre un evento en la pestaña Calendario (desde Tareas u otras vistas). */
  focusEventId: string | null
  openEventInCalendar: (eventId: string) => void
  clearFocusEvent: () => void
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function MarketingPlannerProvider({ children }: { children: ReactNode }) {
  const { supabase, user, profile } = useAuth()
  const [tab, setTab] = useState<PlannerTab>('overview')
  const [teamMembers, setTeamMembers] = useState<MarketingTeamMember[]>([])
  const [memberFilter, setMemberFilter] = useState<AdminMemberFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [focusEventId, setFocusEventId] = useState<string | null>(null)

  const role = (profile?.role ?? '').toString().toLowerCase().trim()
  const isAdmin = role === 'admin'
  const isMarketing = role === 'marketing'

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const openEventInCalendar = useCallback((eventId: string) => {
    setFocusEventId(eventId)
    setTab('calendar')
  }, [])

  const clearFocusEvent = useCallback(() => setFocusEventId(null), [])

  useEffect(() => {
    if (!supabase || !user) return
    async function loadTeam() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['marketing', 'admin'])
        .order('full_name', { ascending: true })
      if (!error && data) setTeamMembers(data as MarketingTeamMember[])
    }
    void loadTeam()
  }, [supabase, user])

  const effectiveOwnerId = useMemo(() => {
    if (!isAdmin || memberFilter === 'all') return user?.id ?? null
    return memberFilter
  }, [isAdmin, memberFilter, user?.id])

  const matchesMemberFilter = useCallback(
    (ownerId: string, createdBy: string) => {
      if (!isAdmin || memberFilter === 'all') return true
      return ownerId === memberFilter || createdBy === memberFilter
    },
    [isAdmin, memberFilter],
  )

  const value = useMemo(
    () => ({
      tab,
      setTab,
      isAdmin,
      isMarketing,
      currentUserId: user?.id ?? null,
      teamMembers,
      memberFilter,
      setMemberFilter,
      effectiveOwnerId,
      matchesMemberFilter,
      refreshKey,
      bumpRefresh,
      focusEventId,
      openEventInCalendar,
      clearFocusEvent,
    }),
    [
      tab,
      isAdmin,
      isMarketing,
      user?.id,
      teamMembers,
      memberFilter,
      effectiveOwnerId,
      matchesMemberFilter,
      refreshKey,
      bumpRefresh,
      focusEventId,
      openEventInCalendar,
      clearFocusEvent,
    ],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function useMarketingPlannerContext() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('useMarketingPlannerContext debe usarse dentro de MarketingPlannerProvider')
  return ctx
}
