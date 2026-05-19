'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatUtcForEcuadorDisplay } from '@/lib/videos/ecuador-time'

interface QueueRow {
  id: string
  noticiero_job_id: string
  caption: string
  scheduled_at: string
  platforms: string[]
  status: string
  noticiero_jobs: { job_name: string | null; final_video_url: string | null } | null
  inventoryoracle: { brand: string; model: string; year: number } | null
}

export function NoticieroPublishingQueueTable({
  refreshKey = 0,
  onMutate,
}: {
  refreshKey?: number
  onMutate?: () => void
}) {
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'published' | 'failed'>('published')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('noticiero_publishing_queue')
        .select(
          `
          id, noticiero_job_id, caption, scheduled_at, platforms, status,
          noticiero_jobs ( job_name, final_video_url ),
          inventoryoracle ( brand, model, year )
        `
        )
        .eq('status', statusFilter)
        .order('scheduled_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setRows((data ?? []) as QueueRow[])
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar la cola')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function handleRetry(queueId: string) {
    try {
      const res = await fetch('/api/marketing/noticiero/publish/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Reintento ejecutado')
      onMutate?.()
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reintento falló')
    }
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['published', 'failed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full ${
              statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s === 'published' ? 'Publicados' : 'Fallidos'}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No hay registros en esta categoría.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-4">Noticiero</th>
                <th className="py-2 pr-4">Vehículo</th>
                <th className="py-2 pr-4">Programado</th>
                <th className="py-2 pr-4">Redes</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const v = row.inventoryoracle
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {row.noticiero_jobs?.job_name ?? row.noticiero_job_id.slice(0, 8)}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {v ? `${v.brand} ${v.model} ${v.year}` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                      {formatUtcForEcuadorDisplay(row.scheduled_at)}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{row.platforms.join(', ')}</td>
                    <td className="py-3">
                      {row.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => void handleRetry(row.id)}
                          className="inline-flex items-center gap-1 text-violet-600 font-semibold text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reintentar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

