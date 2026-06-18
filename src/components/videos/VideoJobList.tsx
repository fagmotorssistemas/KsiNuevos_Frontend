'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Film, Search } from 'lucide-react'
import { VideoJobCard } from './VideoJobCard'
import type { VideoJob, VideoJobStatus } from '@/lib/videos/types'

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

const JOB_SELECT = `
  *,
  inventory_vehicle:inventoryoracle!inventory_vehicle_id (
    id,
    brand,
    model,
    year,
    plate
  )
`

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

interface VideoJobListProps {
  refreshKey?: number
  /** Incrementar para refrescar lista tras cambios en publicación (aprobar, etc.). */
  publishRefreshKey?: number
}

export function VideoJobList({ refreshKey = 0, publishRefreshKey = 0 }: VideoJobListProps) {
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<VideoJobStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const PAGE_SIZE = 20

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const fetchJobs = useCallback(
    async (currentPage: number, currentFilter: VideoJobStatus | 'all', search: string) => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        let query = supabase
          .from('video_jobs_v2')
          .select(JOB_SELECT)
          .neq('flow_type', 'noticiero')
          .order('created_at', { ascending: false })
          .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1)

        if (currentFilter !== 'all') {
          query = query.eq('status', currentFilter)
        }

        if (search) {
          const pattern = `%${escapeIlikePattern(search)}%`
          const { data: invRows } = await supabase
            .from('inventoryoracle')
            .select('id')
            .or(`brand.ilike.${pattern},model.ilike.${pattern}`)

          const invIds = (invRows ?? []).map((r) => r.id)
          const orParts = [
            `job_name.ilike.${pattern}`,
            `vehicle_line_1.ilike.${pattern}`,
            `vehicle_line_2.ilike.${pattern}`,
            `vehicle_line_4.ilike.${pattern}`,
          ]
          if (invIds.length > 0) {
            orParts.push(`inventory_vehicle_id.in.(${invIds.join(',')})`)
          }
          query = query.or(orParts.join(','))
        }

        const { data, error } = await query
        if (error) throw error

        const items = (data ?? []) as unknown as VideoJob[]
        setJobs(currentPage === 0 ? items : (prev) => [...prev, ...items])
        setHasMore(items.length === PAGE_SIZE)
      } catch (err) {
        console.error('[VideoJobList] Error cargando jobs:', err)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    setPage(0)
    setJobs([])
    fetchJobs(0, filter, debouncedSearch)
  }, [filter, debouncedSearch, refreshKey, publishRefreshKey, fetchJobs])

  function handleFilterChange(f: VideoJobStatus | 'all') {
    setFilter(f)
  }

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchJobs(nextPage, filter, debouncedSearch)
  }

  function handleJobDeleted(jobId: string) {
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por marca, modelo o nombre…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
          />
        </div>
        {debouncedSearch ? (
          <p className="text-xs text-gray-500 shrink-0">
            {isLoading && jobs.length === 0
              ? 'Buscando…'
              : `${jobs.length} reel${jobs.length === 1 ? '' : 's'} encontrado${jobs.length === 1 ? '' : 's'}`}
          </p>
        ) : null}
      </div>

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
            <p className="font-semibold text-gray-900">
              {debouncedSearch ? 'Sin resultados' : 'No hay videos aún'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {debouncedSearch
                ? 'Prueba con otra marca, modelo o nombre de job'
                : 'Crea tu primer Reel con el botón de arriba'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {jobs.map((job) => (
              <VideoJobCard
                key={job.id}
                job={job}
                onJobDeleted={handleJobDeleted}
              />
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
