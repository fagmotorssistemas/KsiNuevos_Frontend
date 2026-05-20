'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

/** Planificador: solo admin y marketing (contable excluido). */
export function PlannerRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    const r = (profile?.role ?? '').toString().toLowerCase().trim()
    if (r === 'contable') {
      router.replace('/marketing')
    }
  }, [profile?.role, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
        Cargando planificador…
      </div>
    )
  }

  const r = (profile?.role ?? '').toString().toLowerCase().trim()
  if (r === 'contable') return null

  return <>{children}</>
}
