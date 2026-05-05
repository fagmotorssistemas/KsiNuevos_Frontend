'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw, Pencil, Ban, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { VideoJobV2 } from '@/lib/videos-v2/types'
import { formatUtcForEcuadorDisplay } from '@/lib/videos-v2/ecuador-time'
import { SchedulePublishModal, type QueueRowLike } from './SchedulePublishModal'

type VideoJoin = { job_name: string | null; final_video_url: string | null }
type VehicleJoin = { brand: string; model: string; year: number; version: string | null }

export interface PublishingQueueRow {
  id: string
  video_id: string
  vehicle_id: string | null
  caption: string
  scheduled_at: string
  platforms: string[]
  status: string
  video_jobs_v2: VideoJoin | null
  inventoryoracle: VehicleJoin | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendiente', className: 'bg-blue-100 text-blue-800' },
    publishing: { label: 'Publicando…', className: 'bg-amber-100 text-amber-800' },
    published: { label: 'Publicado', className: 'bg-emerald-100 text-emerald-800' },
    failed: { label: 'Fallido', className: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
  }
  const c = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.className}`}>{c.label}</span>
}

interface ResultModalProps {
  queueId: string | null
  onClose: () => void
}

function PublishResultsModal({ queueId, onClose }: ResultModalProps) {
  const [rows, setRows] = useState<
    { platform: string; status: string; platform_post_id: string | null; error_message: string | null }[]
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!queueId) return
    const supabase = createClient()
    setLoading(true)
    supabase
      .from('video_publishing_results')
      .select('platform, status, platform_post_id, error_message')
      .eq('queue_id', queueId)
      .then(({ data, error }) => {
        if (error) console.error(error)
        setRows(data ?? [])
        setLoading(false)
      })
  }, [queueId])

  if (!queueId) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 className="text-base font-bold text-gray-900 mb-3">Resultado por red</h3>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">Sin registros de resultado.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.platform} className="border border-gray-100 rounded-xl p-3">
                <div className="font-semibold capitalize">{r.platform}</div>
                <div className="text-gray-600">Estado: {r.status}</div>
                {r.platform_post_id ? (
                  <div className="text-xs font-mono break-all mt-1">ID: {r.platform_post_id}</div>
                ) : null}
                {r.error_message ? (
                  <div className="text-xs text-red-600 mt-1 break-words">{r.error_message}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="mt-4 w-full py-2 rounded-xl bg-gray-100 font-semibold text-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export function PublishingQueueTable({
  refreshKey = 0,
  onMutate,
}: {
  refreshKey?: number
  onMutate?: () => void
}) {
  const [rows, setRows] = useState<PublishingQueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resultQueueId, setResultQueueId] = useState<string | null>(null)
  const [editJob, setEditJob] = useState<VideoJobV2 | null>(null)
  const [editQueue, setEditQueue] = useState<QueueRowLike | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('video_publishing_queue')
        .select(
          `
          id, video_id, vehicle_id, caption, scheduled_at, platforms, status,
          video_jobs_v2 ( job_name, final_video_url ),
          inventoryoracle ( brand, model, year, version )
        `
        )
        .order('scheduled_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setRows((data ?? []) as unknown as PublishingQueueRow[])
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar la cola')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function handleRetry(queueId: string) {
    try {
      const res = await fetch('/api/videos-v2/publish/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Reintento enviado')
      load()
      onMutate?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  async function handleCancel(queueId: string) {
    if (!confirm('¿Cancelar esta publicación programada?')) return
    try {
      const res = await fetch(`/api/videos-v2/publish/queue/${queueId}`, { method: 'DELETE' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Cancelado')
      load()
      onMutate?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  function openEdit(row: PublishingQueueRow) {
    const job: VideoJobV2 = {
      id: row.video_id,
      created_at: '',
      updated_at: '',
      flow_type: 'single',
      raw_video_paths: [],
      status: 'completed',
      current_step: null,
      progress_percentage: 100,
      error_message: null,
      assemblyai_transcript_id: null,
      srt_content: null,
      gemini_analysis: null,
      creatomate_render_id: null,
      final_video_url: row.video_jobs_v2?.final_video_url ?? null,
      final_video_duration: null,
      music_track_url: null,
      selected_clips: null,
      segment_map: null,
      adjusted_srt: null,
      job_name: row.video_jobs_v2?.job_name ?? null,
    }
    setEditJob(job)
    setEditQueue({
      id: row.id,
      vehicle_id: row.vehicle_id,
      caption: row.caption,
      platforms: row.platforms,
      scheduled_at: row.scheduled_at,
    })
    setModalOpen(true)
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Video</th>
              <th className="px-3 py-2">Vehículo</th>
              <th className="px-3 py-2">Redes</th>
              <th className="px-3 py-2">Programado</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const v = row.inventoryoracle
              const vehLabel = v ? `${v.brand} ${v.model} ${v.year}` : '—'
              return (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate">
                    {row.video_jobs_v2?.job_name || row.video_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{vehLabel}</td>
                  <td className="px-3 py-2 text-gray-600">{row.platforms.join(', ')}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatUtcForEcuadorDisplay(row.scheduled_at)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    {row.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold"
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(row.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold"
                        >
                          <Ban className="w-3 h-3" /> Cancelar
                        </button>
                      </>
                    )}
                    {row.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" /> Reintentar
                      </button>
                    )}
                    {row.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => setResultQueueId(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold"
                      >
                        <Eye className="w-3 h-3" /> Ver resultado
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !loading ? (
        <p className="text-center text-sm text-gray-500 py-8">No hay publicaciones programadas.</p>
      ) : null}

      <PublishResultsModal queueId={resultQueueId} onClose={() => setResultQueueId(null)} />

      <SchedulePublishModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditJob(null)
          setEditQueue(null)
        }}
        job={editJob}
        mode="edit"
        initialQueue={editQueue ?? undefined}
        onScheduled={() => {
          load()
          onMutate?.()
        }}
      />
    </>
  )
}
