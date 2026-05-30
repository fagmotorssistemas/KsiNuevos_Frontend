'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { devRequestsDb } from '@/lib/marketing-dev-requests/db'
import { isDevRequestsAdmin, getDevRequestRoleScope } from '@/lib/marketing-dev-requests/access'

const OPEN_STATUSES = ['new', 'in_review', 'in_progress', 'blocked'] as const

/** Contador ligero para el badge del sidebar (solicitudes abiertas). */
export function useDevRequestsOpenCount() {
  const { supabase, profile } = useAuth()
  const [count, setCount] = useState(0)
  const isAdmin = isDevRequestsAdmin(profile?.role)
  const roleScope = getDevRequestRoleScope(profile?.role)

  const refresh = useCallback(async () => {
    if (!supabase) return
    let q = devRequestsDb(supabase)
      .from('marketing_dev_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_STATUSES])

    if (!isAdmin && roleScope) {
      if (roleScope.length === 0) {
        setCount(0)
        return
      }
      if (roleScope.length === 1) {
        q = q.eq('requester_role', roleScope[0])
      } else {
        q = q.in('requester_role', roleScope)
      }
    }

    const { count: n, error } = await q
    if (error) {
      console.warn('[dev-requests-badge]', error)
      setCount(0)
    } else {
      setCount(n ?? 0)
    }
  }, [supabase, isAdmin, roleScope])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [refresh])

  return { count, refresh }
}
