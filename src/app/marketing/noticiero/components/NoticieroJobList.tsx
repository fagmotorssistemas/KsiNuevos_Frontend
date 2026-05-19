'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Newspaper } from 'lucide-react'
import { NoticieroJobCard } from './NoticieroJobCard'
import type { NoticieroJob } from '@/lib/noticiero/types'

interface NoticieroJobListProps {
  refreshKey?: number
  publishRefreshKey?: number
}

export function NoticieroJobList({ refreshKey = 0, publishRefreshKey = 0 }: NoticieroJobListProps) {
  const [jobs, setJobs] = useState<NoticieroJob[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('noticiero_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setJobs((data ?? []) as NoticieroJob[])
    } catch (e) {
      console.error('[NoticieroJobList]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey, publishRefreshKey])

  if (loading && jobs.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Newspaper className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">No hay noticieros generados</p>
          <p className="text-sm text-gray-500 mt-1">Crea tu primer clip con el formulario de arriba</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {jobs.map((job) => (
        <NoticieroJobCard
          key={job.id}
          job={job}
          onJobDeleted={(id) => setJobs((prev) => prev.filter((j) => j.id !== id))}
          onApproved={load}
          onJobUpdated={load}
        />
      ))}
    </div>
  )
}
