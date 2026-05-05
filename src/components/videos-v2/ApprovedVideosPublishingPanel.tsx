'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CalendarPlus, Film } from 'lucide-react'
import type { VideoJobV2 } from '@/lib/videos-v2/types'
import { resolveSocialPublishStage } from '@/lib/videos-v2/publish-flow'
import { SchedulePublishModal } from './SchedulePublishModal'

export function ApprovedVideosPublishingPanel({
  refreshKey = 0,
  onScheduleDone,
}: {
  refreshKey?: number
  onScheduleDone?: () => void
}) {
  const [jobs, setJobs] = useState<VideoJobV2[]>([])
  const [loading, setLoading] = useState(true)
  const [modalJob, setModalJob] = useState<VideoJobV2 | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('video_jobs_v2')
        .select('*')
        .eq('status', 'completed')
        .eq('social_publish_stage', 'aprobado')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setJobs((data ?? []) as VideoJobV2[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

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
          Aprueba un video completado desde la lista de Reels (botón &quot;Aprobar para publicar&quot;).
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const stage = resolveSocialPublishStage(job)
          return (
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
                <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {stage === 'aprobado' ? 'Aprobado' : stage ?? ''}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-bold text-gray-900 truncate">{job.job_name || `Job ${job.id.slice(0, 8)}`}</p>
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
