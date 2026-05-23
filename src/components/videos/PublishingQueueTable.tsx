'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw, Pencil, Ban, Eye, Search, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { VideoJob } from '@/lib/videos/types'
import { formatUtcForEcuadorDisplay } from '@/lib/videos/ecuador-time'
import { SchedulePublishModal, type QueueRowLike } from './SchedulePublishModal'
import { RepublishModal } from './RepublishModal'

type VideoJoin = { job_name: string | null; final_video_url: string | null; flow_type?: string | null }
type VehicleJoin = { brand: string; model: string; year: number; version: string | null }
type PublishResultRow = { queue_id: string; platform: string; platform_post_id: string | null }

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

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatPlatformLabel(platform: string) {
  if (platform === 'instagram') return 'Instagram'
  if (platform === 'facebook') return 'Facebook'
  return toTitleCase(platform)
}

function formatStatusLabel(status: string) {
  if (status === 'published') return 'Publicado'
  if (status === 'failed') return 'Fallido'
  if (status === 'cancelled') return 'Cancelado'
  return toTitleCase(status)
}

function buildDirectPostUrl(platform: string, postId: string | null): string | null {
  if (!postId) return null
  if (/^https?:\/\//i.test(postId)) return postId
  if (platform === 'facebook') return `https://www.facebook.com/watch/?v=${postId}`
  return null
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
                <div className="font-semibold">{formatPlatformLabel(r.platform)}</div>
                <div className="text-gray-600">Estado: {formatStatusLabel(r.status)}</div>
                {r.platform_post_id ? (
                  <div className="text-xs font-mono break-all mt-1">
                    {/^https?:\/\//i.test(r.platform_post_id) ? (
                      <a
                        href={r.platform_post_id}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-700 hover:underline"
                      >
                        Abrir enlace
                      </a>
                    ) : (
                      <>ID: {r.platform_post_id}</>
                    )}
                  </div>
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
  flowTypeFilter,
}: {
  refreshKey?: number
  onMutate?: () => void
  flowTypeFilter?: string
}) {
  const [rows, setRows] = useState<PublishingQueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resultQueueId, setResultQueueId] = useState<string | null>(null)
  const [editJob, setEditJob] = useState<VideoJob | null>(null)
  const [editQueue, setEditQueue] = useState<QueueRowLike | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'published' | 'failed' | 'cancelled'>('published')
  const [query, setQuery] = useState('')
  const [resultsByQueue, setResultsByQueue] = useState<Record<string, PublishResultRow[]>>({})
  const [republishTarget, setRepublishTarget] = useState<{ queueId: string; platforms: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('video_publishing_queue')
        .select(
          `
          id, video_id, vehicle_id, caption, scheduled_at, platforms, status,
          video_jobs_v2 ( job_name, final_video_url, flow_type ),
          inventoryoracle ( brand, model, year, version )
        `
        )
        .in('status', ['published', 'failed', 'cancelled'])
        .order('scheduled_at', { ascending: false })
        .limit(200)
      if (error) throw error
      let queueRows = (data ?? []) as unknown as PublishingQueueRow[]
      if (flowTypeFilter) {
        queueRows = queueRows.filter((r) => r.video_jobs_v2?.flow_type === flowTypeFilter)
      }
      setRows(queueRows)

      const queueIds = queueRows.map((r) => r.id)
      if (queueIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('video_publishing_results')
          .select('queue_id, platform, platform_post_id')
          .in('queue_id', queueIds)

        const grouped: Record<string, PublishResultRow[]> = {}
        for (const row of (resultsData ?? []) as PublishResultRow[]) {
          grouped[row.queue_id] = [...(grouped[row.queue_id] ?? []), row]
        }
        setResultsByQueue(grouped)
      } else {
        setResultsByQueue({})
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar la cola')
    } finally {
      setLoading(false)
    }
  }, [flowTypeFilter])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function handleRetry(queueId: string) {
    try {
      const res = await fetch('/api/videos/publish/retry', {
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
      const res = await fetch(`/api/videos/publish/queue/${queueId}`, { method: 'DELETE' })
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
    const job: VideoJob = {
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

  const filteredRows = rows.filter((row) => {
    if (row.status !== statusFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    const v = row.inventoryoracle
    const text = `${row.video_jobs_v2?.job_name ?? ''} ${row.video_id} ${v?.brand ?? ''} ${v?.model ?? ''} ${v?.year ?? ''}`.toLowerCase()
    return text.includes(q)
  })

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por video o vehículo..."
              className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['published', 'failed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {formatStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>

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
            {filteredRows.map((row) => {
              const v = row.inventoryoracle
              const vehLabel = v ? `${toTitleCase(v.brand)} ${toTitleCase(v.model)} ${v.year}` : '—'
              const postLinks = (resultsByQueue[row.id] ?? [])
                .map((r) => ({ platform: r.platform, url: buildDirectPostUrl(r.platform, r.platform_post_id) }))
                .filter((x): x is { platform: string; url: string } => Boolean(x.url))
              return (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate">
                    {row.video_jobs_v2?.job_name || row.video_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{vehLabel}</td>
                  <td className="px-3 py-2 text-gray-600">{row.platforms.map(formatPlatformLabel).join(', ')}</td>
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
                    {(row.status === 'published' || row.status === 'failed') && (
                      <>
                        {postLinks.length > 0 ? (
                          <a
                            href={postLinks[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setRepublishTarget({ queueId: row.id, platforms: row.platforms })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-900 hover:bg-violet-100 text-xs font-semibold"
                        >
                          <RefreshCw className="w-3 h-3" /> Republicar
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultQueueId(row.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold"
                        >
                          <Eye className="w-3 h-3" /> Ver resultado
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
      {filteredRows.length === 0 && !loading ? (
        <p className="text-center text-sm text-gray-500 py-8">No hay publicaciones programadas.</p>
      ) : null}

      <PublishResultsModal queueId={resultQueueId} onClose={() => setResultQueueId(null)} />

      <RepublishModal
        queueId={republishTarget?.queueId ?? null}
        scheduledPlatforms={republishTarget?.platforms ?? []}
        onClose={() => setRepublishTarget(null)}
        onDone={() => {
          load()
          onMutate?.()
        }}
      />

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
