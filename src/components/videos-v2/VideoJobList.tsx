'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Film } from 'lucide-react'
import { VideoJobCard } from './VideoJobCard'
import type { VideoJobV2, VideoJobStatus } from '@/lib/videos-v2/types'

const STATUS_FILTERS: Array<{ value: VideoJobStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'uploading', label: 'Subiendo' },
  { value: 'transcribing', label: 'Transcribiendo' },
  { value: 'analyzing', label: 'Analizando' },
  { value: 'rendering', label: 'Renderizando' },
  { value: 'completed', label: 'Completados' },
  { value: 'failed', label: 'Errores' },
]

interface VideoJobListProps {
  refreshKey?: number
}

export function VideoJobList({ refreshKey = 0 }: VideoJobListProps) {
  const [jobs, setJobs] = useState<VideoJobV2[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<VideoJobStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const PAGE_SIZE = 20

  const fetchJobs = useCallback(async (currentPage: number, currentFilter: VideoJobStatus | 'all') => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('video_jobs_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

      if (currentFilter !== 'all') {
        query = query.eq('status', currentFilter)
      }

      const { data, error } = await query
      if (error) throw error

      const items = (data ?? []) as unknown as VideoJobV2[]
      setJobs(currentPage === 0 ? items : (prev) => [...prev, ...items])
      setHasMore(items.length === PAGE_SIZE + 1)
    } catch (err) {
      console.error('[VideoJobList] Error cargando jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(0)
    setJobs([])
    fetchJobs(0, filter)
  }, [filter, refreshKey, fetchJobs])

  function handleFilterChange(f: VideoJobStatus | 'all') {
    setFilter(f)
  }

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchJobs(nextPage, filter)
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              filter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid de jobs */}
      {isLoading && jobs.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Film className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">No hay videos aún</p>
            <p className="text-sm text-gray-500 mt-1">Crea tu primer Reel con el botón de arriba</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {jobs.map((job) => (
              <VideoJobCard key={job.id} job={job} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Cargar más
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
