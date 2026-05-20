'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CalendarPlus, Film, Search } from 'lucide-react'
import type { VideoJob } from '@/lib/videos/types'
import { resolveSocialPublishStage } from '@/lib/videos/publish-flow'
import { SchedulePublishModal } from './SchedulePublishModal'

export function ApprovedVideosPublishingPanel({
  refreshKey = 0,
  onScheduleDone,
  flowTypeFilter,
  emptyHint,
}: {
  refreshKey?: number
  onScheduleDone?: () => void
  /** Ej. `noticiero` para mostrar solo clips del noticiero IA */
  flowTypeFilter?: string
  emptyHint?: string
}) {
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [loading, setLoading] = useState(true)
  const [modalJob, setModalJob] = useState<VideoJob | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('video_jobs_v2')
        .select('*')
        .eq('status', 'completed')
        .eq('social_publish_stage', 'aprobado')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (flowTypeFilter) {
        query = query.eq('flow_type', flowTypeFilter)
      }
      const { data, error } = await query
      if (error) throw error
      setJobs((data ?? []) as VideoJob[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [flowTypeFilter])

  useEffect(() => {
    load()
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
        <Film className="w-12 h-12 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-800">No hay videos aprobados</p>
        <p className="text-sm mt-1 max-w-md">
          {emptyHint ??
            'Aprueba un video completado desde la lista (botón "Aprobar para publicar").'}
        </p>
      </div>
    )
  }

  const filtered = jobs.filter((job) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const text = `${job.job_name ?? ''} ${job.id}`.toLowerCase()
    return text.includes(q)
  })

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar video aprobado por nombre o ID..."
                className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((job) => {
          const stage = resolveSocialPublishStage(job)
          return (
            <div key={job.id} className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
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
                <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {stage === 'aprobado' ? 'Aprobado' : stage ?? ''}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm font-bold text-gray-900 truncate">{job.job_name || `Job ${job.id.slice(0, 8)}`}</p>
                <p className="text-xs text-gray-500 font-mono">{job.id.slice(0, 8)}</p>
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
          )
          })}
        </div>
      </div>

      <SchedulePublishModal
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
