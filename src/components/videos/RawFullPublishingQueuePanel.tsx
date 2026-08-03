'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Ban,
  CalendarClock,
  ExternalLink,
  Eye,
  Film,
  Instagram,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import type { VideoJob } from '@/lib/videos/types'
import { formatUtcForEcuadorDisplay } from '@/lib/videos/ecuador-time'
import { SchedulePublishModal, type QueueRowLike } from './SchedulePublishModal'
import { RepublishModal } from './RepublishModal'

type VideoJoin = {
  job_name: string | null
  final_video_url: string | null
  flow_type?: string | null
  selected_clips?: unknown
}

type VehicleJoin = { brand: string; model: string; year: number; version: string | null }

type QueueRow = {
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

type PublishResultRow = { queue_id: string; platform: string; platform_post_id: string | null }

type StatusFilter = 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'

const STATUS_META: Record<
  StatusFilter,
  { label: string; chip: string; accent: string }
> = {
  pending: {
    label: 'Programado',
    chip: 'bg-sky-600 text-white',
    accent: 'border-l-sky-500',
  },
  publishing: {
    label: 'Publicando',
    chip: 'bg-amber-500 text-white',
    accent: 'border-l-amber-500',
  },
  published: {
    label: 'Publicado',
    chip: 'bg-emerald-600 text-white',
    accent: 'border-l-emerald-500',
  },
  failed: {
    label: 'Fallido',
    chip: 'bg-red-600 text-white',
    accent: 'border-l-red-500',
  },
  cancelled: {
    label: 'Cancelado',
    chip: 'bg-slate-500 text-white',
    accent: 'border-l-slate-400',
  },
}

function isRawFullJob(job: VideoJoin | null | undefined): boolean {
  if (!job) return false
  if (job.flow_type === 'raw_full') return true
  const clips = job.selected_clips
  if (clips && typeof clips === 'object' && !Array.isArray(clips)) {
    return (clips as { _v2_full_raw_publish?: boolean })._v2_full_raw_publish === true
  }
  return false
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
  return platform
}

function buildDirectPostUrl(platform: string, postId: string | null): string | null {
  if (!postId) return null
  if (/^https?:\/\//i.test(postId)) return postId
  if (platform === 'facebook') return `https://www.facebook.com/watch/?v=${postId}`
  return null
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14 8.2h2.1V5H14c-2.4 0-4 1.5-4 4.1V11H7.5v3.2H10V21h3.3v-6.8h2.5l.5-3.2h-3V9.2c0-.7.3-1 1.2-1Z" />
    </svg>
  )
}

function PublishResultsModal({
  queueId,
  onClose,
}: {
  queueId: string | null
  onClose: () => void
}) {
  const [rows, setRows] = useState<
    { platform: string; status: string; platform_post_id: string | null; error_message: string | null }[]
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!queueId) return
    const supabase = createClient()
    setLoading(true)
    void supabase
      .from('video_publishing_results')
      .select('platform, status, platform_post_id, error_message')
      .eq('queue_id', queueId)
      .then(({ data }) => {
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
                <div className="text-gray-600">Estado: {STATUS_META[r.status as StatusFilter]?.label ?? r.status}</div>
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
        <button
          type="button"
          className="mt-4 w-full py-2 rounded-xl bg-gray-100 font-semibold text-sm"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export function RawFullPublishingQueuePanel({
  refreshKey = 0,
  onMutate,
}: {
  refreshKey?: number
  onMutate?: () => void
}) {
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [query, setQuery] = useState('')
  const [resultsByQueue, setResultsByQueue] = useState<Record<string, PublishResultRow[]>>({})
  const [resultQueueId, setResultQueueId] = useState<string | null>(null)
  const [editJob, setEditJob] = useState<VideoJob | null>(null)
  const [editQueue, setEditQueue] = useState<QueueRowLike | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [republishTarget, setRepublishTarget] = useState<{
    queueId: string
    platforms: string[]
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('video_publishing_queue')
        .select(
          `
          id, video_id, vehicle_id, caption, scheduled_at, platforms, status,
          video_jobs_v2 ( job_name, final_video_url, flow_type, selected_clips ),
          inventoryoracle ( brand, model, year, version )
        `
        )
        .in('status', ['pending', 'publishing', 'published', 'failed', 'cancelled'])
        .order('scheduled_at', { ascending: false })
        .limit(200)
      if (error) throw error

      const queueRows = ((data ?? []) as unknown as QueueRow[]).filter((r) =>
        isRawFullJob(r.video_jobs_v2)
      )
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
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      pending: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      cancelled: 0,
    }
    for (const r of rows) {
      if (r.status in base) base[r.status as StatusFilter] += 1
    }
    return base
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (row.status !== statusFilter) return false
        if (!q) return true
        const v = row.inventoryoracle
        const text =
          `${row.video_jobs_v2?.job_name ?? ''} ${row.caption} ${v?.brand ?? ''} ${v?.model ?? ''} ${v?.year ?? ''}`.toLowerCase()
        return text.includes(q)
      })
      .sort((a, b) => {
        const aMs = new Date(a.scheduled_at).getTime()
        const bMs = new Date(b.scheduled_at).getTime()
        if (statusFilter === 'pending' || statusFilter === 'publishing') return aMs - bMs
        return bMs - aMs
      })
  }, [rows, statusFilter, query])

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
      void load()
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
      void load()
      onMutate?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  function openEdit(row: QueueRow) {
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
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(STATUS_META) as StatusFilter[]).map((s) => {
            const active = statusFilter === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  active
                    ? 'border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-wide ${active ? 'text-violet-700' : 'text-gray-500'}`}>
                  {STATUS_META[s].label}
                </p>
                <p className={`mt-1 text-2xl font-extrabold tabular-nums ${active ? 'text-violet-900' : 'text-gray-900'}`}>
                  {counts[s]}
                </p>
              </button>
            )
          })}
        </div>

        <div className="relative max-w-lg">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, caption o vehículo…"
            className="w-full h-11 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gradient-to-b from-white to-slate-50 px-6 py-14 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <CalendarClock className="w-6 h-6" />
            </div>
            <p className="mt-4 font-bold text-gray-900">
              {statusFilter === 'pending'
                ? 'Nada programado todavía'
                : `Sin ítems en “${STATUS_META[statusFilter].label}”`}
            </p>
            <p className="mt-1.5 text-sm text-gray-500 max-w-md mx-auto">
              {statusFilter === 'pending'
                ? 'Cuando programes un video en bruto, aparecerá aquí con fecha, redes y copy.'
                : 'Cambia de filtro o programa un video nuevo desde Carpetas.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredRows.map((row) => {
              const meta = STATUS_META[row.status as StatusFilter] ?? STATUS_META.pending
              const v = row.inventoryoracle
              const title = row.video_jobs_v2?.job_name || 'Video en bruto'
              const vehLabel = v
                ? `${toTitleCase(v.brand)} ${toTitleCase(v.model)} ${v.year}`
                : 'Sin vehículo'
              const thumb = row.video_jobs_v2?.final_video_url
              const postLinks = (resultsByQueue[row.id] ?? [])
                .map((r) => ({
                  platform: r.platform,
                  url: buildDirectPostUrl(r.platform, r.platform_post_id),
                }))
                .filter((x): x is { platform: string; url: string } => Boolean(x.url))

              return (
                <article
                  key={row.id}
                  className={`rounded-[1.35rem] border border-gray-200 bg-white overflow-hidden shadow-sm border-l-4 ${meta.accent}`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative sm:w-40 h-40 sm:h-auto sm:min-h-[168px] bg-slate-900 shrink-0">
                      {thumb ? (
                        <video
                          src={`${thumb}#t=0.1`}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[168px] flex items-center justify-center text-slate-500">
                          <Film className="w-8 h-8" />
                        </div>
                      )}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${meta.chip}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
                      <div>
                        <h3 className="font-extrabold text-gray-900 truncate" title={title}>
                          {title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{vehLabel}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 font-semibold">
                          <CalendarClock className="w-3.5 h-3.5 text-violet-600" />
                          {formatUtcForEcuadorDisplay(row.scheduled_at)}
                        </span>
                        {row.platforms.includes('instagram') ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf2f8] text-[#9d174d] px-2.5 py-1 font-semibold">
                            <Instagram className="w-3.5 h-3.5" />
                            IG
                          </span>
                        ) : null}
                        {row.platforms.includes('facebook') ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] text-[#1d4ed8] px-2.5 py-1 font-semibold">
                            <FacebookGlyph className="w-3.5 h-3.5" />
                            FB
                          </span>
                        ) : null}
                      </div>

                      {row.caption ? (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                          {row.caption}
                        </p>
                      ) : null}

                      <div className="mt-auto flex flex-wrap gap-2 pt-1">
                        {row.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCancel(row.id)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                          </>
                        ) : null}

                        {row.status === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => void handleRetry(row.id)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reintentar
                          </button>
                        ) : null}

                        {row.status === 'published' || row.status === 'failed' ? (
                          <>
                            {postLinks[0] ? (
                              <a
                                href={postLinks[0].url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                setRepublishTarget({ queueId: row.id, platforms: row.platforms })
                              }
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-violet-200 text-violet-800 hover:bg-violet-50 text-xs font-bold"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Republicar
                            </button>
                            <button
                              type="button"
                              onClick={() => setResultQueueId(row.id)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Resultado
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <PublishResultsModal queueId={resultQueueId} onClose={() => setResultQueueId(null)} />

      <RepublishModal
        queueId={republishTarget?.queueId ?? null}
        scheduledPlatforms={republishTarget?.platforms ?? []}
        onClose={() => setRepublishTarget(null)}
        onDone={() => {
          void load()
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
          void load()
          onMutate?.()
        }}
      />
    </>
  )
}
