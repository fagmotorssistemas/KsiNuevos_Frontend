'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { devRequestsDb } from '@/lib/marketing-dev-requests/db'

const OPEN_STATUSES = ['new', 'in_review', 'in_progress', 'blocked'] as const

/** Contador ligero para el badge del sidebar (solicitudes abiertas). */
export function useDevRequestsOpenCount() {
  const { supabase, user, profile } = useAuth()
  const [count, setCount] = useState(0)
  const isAdmin = profile?.role === 'admin'

  const refresh = useCallback(async () => {
    if (!supabase) return
    let q = devRequestsDb(supabase)
      .from('marketing_dev_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_STATUSES])

    if (!isAdmin && user?.id) {
      q = q.eq('created_by', user.id)
    }

    const { count: n, error } = await q
    if (error) {
      console.warn('[dev-requests-badge]', error)
      setCount(0)
    } else {
      setCount(n ?? 0)
    }
  }, [supabase, isAdmin, user?.id])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [refresh])

  return { count, refresh }
}
