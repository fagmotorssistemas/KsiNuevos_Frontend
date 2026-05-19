'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CalendarPlus, Newspaper, Search } from 'lucide-react'
import type { NoticieroJob } from '@/lib/noticiero/types'
import { NoticieroSchedulePublishModal } from './NoticieroSchedulePublishModal'

export function NoticieroApprovedPanel({
  refreshKey = 0,
  onScheduleDone,
}: {
  refreshKey?: number
  onScheduleDone?: () => void
}) {
  const [jobs, setJobs] = useState<NoticieroJob[]>([])
  const [loading, setLoading] = useState(true)
  const [modalJob, setModalJob] = useState<NoticieroJob | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('noticiero_jobs')
        .select('*')
        .eq('status', 'completed')
        .eq('social_publish_stage', 'aprobado')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setJobs((data ?? []) as NoticieroJob[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (loading && jobs.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center text-gray-500">
        <Newspaper className="w-12 h-12 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-800">No hay noticieros aprobados</p>
        <p className="text-sm mt-1 max-w-md">
          Aprueba un noticiero completado desde la pestaña Generación.
        </p>
      </div>
    )
  }

  const filtered = jobs.filter((job) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${job.job_name ?? ''} ${job.id}`.toLowerCase().includes(q)
  })

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar noticiero aprobado..."
            className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <div key={job.id} className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              <div className="h-40 bg-gray-900 relative">
                {job.final_video_url ? (
                  <video
                    src={`${job.final_video_url}#t=0.1`}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sin preview</div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm font-bold text-gray-900 truncate">{job.job_name || job.id.slice(0, 8)}</p>
                <button
                  type="button"
                  onClick={() => setModalJob(job)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Programar publicación
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NoticieroSchedulePublishModal
        isOpen={!!modalJob}
        onClose={() => setModalJob(null)}
        job={modalJob}
        mode="create"
        onScheduled={() => {
          load()
          onScheduleDone?.()
        }}
      />
    </>
  )
}

