'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Film,
  Loader2,
  ListVideo,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Download,
  PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBytes, type RawFullVideoFolderSummary, type RawFullVideoItem } from '@/lib/videos/raw-full-videos-library'
import {
  RAW_FULL_PILAR_TABS,
  rawFullFolderToPilarTab,
  type RawFullPilarTabId,
} from '@/lib/videos/raw-full-caption-templates'
import { UploadFullVideosModal } from '@/components/videos/UploadFullVideosModal'
import { ScheduleRawFullPublishModal } from '@/components/videos/ScheduleRawFullPublishModal'
import { RawFullPublishingQueuePanel } from '@/components/videos/RawFullPublishingQueuePanel'

function formatUploadDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function cardTitle(folder: RawFullVideoFolderSummary): string {
  const inv = folder.inventory
  if (inv?.brand || inv?.model) {
    return [inv.brand, inv.model, inv.year].filter(Boolean).join(' ')
  }
  return folder.title
}

const PILAR_CHIP: Record<RawFullPilarTabId, string> = {
  pilar1: 'bg-cyan-50 text-cyan-800',
  pilar2: 'bg-rose-50 text-rose-800',
  pilar3: 'bg-orange-50 text-orange-800',
  pilar4: 'bg-violet-50 text-violet-800',
}

type MainTab = 'library' | 'queue'

type LibraryVideoCard = {
  folder: RawFullVideoFolderSummary
  video: RawFullVideoItem
}

export type RawFullVideosLibraryDashboardProps = {
  embedded?: boolean
  hideHeader?: boolean
  inventoryVehicleId?: string
  vehicleTitle?: string
  lockedPilarTab?: RawFullPilarTabId
  hidePilarTabs?: boolean
  hideMainTabs?: boolean
  forceMainTab?: MainTab
  hideUploadButton?: boolean
  refreshKey?: number
  onOpenQueue?: () => void
}

export function RawFullVideosLibraryDashboard({
  embedded = false,
  hideHeader = false,
  inventoryVehicleId,
  vehicleTitle,
  lockedPilarTab,
  hidePilarTabs = false,
  hideMainTabs = false,
  forceMainTab,
  hideUploadButton = false,
  refreshKey = 0,
  onOpenQueue,
}: RawFullVideosLibraryDashboardProps = {}) {
  const [mainTab, setMainTab] = useState<MainTab>(forceMainTab ?? 'library')
  const [pilarTab, setPilarTab] = useState<RawFullPilarTabId>(lockedPilarTab ?? 'pilar1')
  const [queueRefreshKey, setQueueRefreshKey] = useState(0)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [folders, setFolders] = useState<RawFullVideoFolderSummary[]>([])
  const [stats, setStats] = useState({ totalFolders: 0, totalVideos: 0, totalBytes: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [appendTarget, setAppendTarget] = useState<{
    id: string
    title: string
    videoCount: number
  } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busyPath, setBusyPath] = useState<string | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<{
    folderId: string
    videoPath: string
    caption: string
    vehicleId: string | null
  } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const effectiveMainTab = forceMainTab ?? mainTab
  const effectivePilarTab = lockedPilarTab ?? pilarTab
  const showPilarTabs = !hidePilarTabs && !lockedPilarTab && !inventoryVehicleId

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '48' })
      if (debouncedQ) params.set('q', debouncedQ)
      if (inventoryVehicleId?.trim()) params.set('inventoryVehicleId', inventoryVehicleId.trim())
      const res = await fetch(`/api/videos/raw-full/library?${params}`, { credentials: 'include' })
      const data = (await res.json()) as {
        error?: string
        folders?: RawFullVideoFolderSummary[]
        stats?: { totalFolders: number; totalVideos: number; totalBytes: number }
      }
      if (!res.ok) throw new Error(data.error ?? 'Error cargando biblioteca')
      setFolders(data.folders ?? [])
      setStats(data.stats ?? { totalFolders: 0, totalVideos: 0, totalBytes: 0 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando biblioteca')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, inventoryVehicleId])

  useEffect(() => {
    if (effectiveMainTab === 'library') void loadLibrary()
  }, [loadLibrary, effectiveMainTab, refreshKey])

  const filteredFolders = useMemo(() => {
    if (inventoryVehicleId) return folders
    return folders.filter((f) => rawFullFolderToPilarTab(f) === effectivePilarTab)
  }, [folders, effectivePilarTab, inventoryVehicleId])

  const videoCards = useMemo<LibraryVideoCard[]>(() => {
    const cards: LibraryVideoCard[] = []
    for (const folder of filteredFolders) {
      for (const video of folder.videos ?? []) {
        cards.push({ folder, video })
      }
    }
    return cards
  }, [filteredFolders])

  const displayStats = useMemo(() => {
    if (!lockedPilarTab && !inventoryVehicleId) {
      return {
        totalVideos: stats.totalVideos,
        totalBytes: stats.totalBytes,
      }
    }
    return {
      totalVideos: videoCards.length,
      totalBytes: videoCards.reduce((sum, c) => sum + c.video.sizeBytes, 0),
    }
  }, [inventoryVehicleId, lockedPilarTab, stats.totalBytes, stats.totalVideos, videoCards])

  async function handleDeleteVideo(folderId: string, path: string) {
    if (!confirm('¿Eliminar este video de la biblioteca?')) return
    setBusyPath(path)
    try {
      const res = await fetch(`/api/videos/raw-full/library/${folderId}/videos`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar')
      toast.success('Video eliminado')
      void loadLibrary()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setBusyPath(null)
    }
  }

  async function runProcessNow() {
    setProcessingQueue(true)
    try {
      const res = await fetch('/api/videos/publish/process', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as { processed?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const n = data.processed ?? 0
      toast.success(n > 0 ? `Cola procesada: ${n} ítem(s)` : 'Nada pendiente por ahora')
      setQueueRefreshKey((k) => k + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar el procesador')
    } finally {
      setProcessingQueue(false)
    }
  }

  function goToQueue() {
    if (onOpenQueue) {
      onOpenQueue()
      return
    }
    setMainTab('queue')
    setQueueRefreshKey((k) => k + 1)
  }

  const lockedTabLabel =
    RAW_FULL_PILAR_TABS.find((t) => t.id === effectivePilarTab)?.label ?? 'este formato'

  return (
    <div className="space-y-6">
      {hideHeader ? (
        <div className="flex flex-wrap justify-end gap-2">
          {effectiveMainTab === 'library' ? (
            <button
              type="button"
              onClick={() => void loadLibrary()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setQueueRefreshKey((k) => k + 1)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                type="button"
                disabled={processingQueue}
                onClick={() => void runProcessNow()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {processingQueue ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                Procesar cola ahora
              </button>
            </>
          )}
          {!hideUploadButton && effectiveMainTab === 'library' ? (
            <button
              type="button"
              onClick={() => {
                setAppendTarget(null)
                setUploadOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Subir videos
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Marketing</p>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {vehicleTitle ? `Videos en bruto · ${vehicleTitle}` : 'Biblioteca de videos en bruto'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {embedded
                ? 'Videos enteros de este vehículo, listos para programar publicación.'
                : 'Videos enteros ya creados en otra herramienta. Cola de publicación propia (no se mezcla con Videos).'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {effectiveMainTab === 'library' ? (
              <>
                <button
                  type="button"
                  onClick={() => void loadLibrary()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
                {!hideUploadButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppendTarget(null)
                      setUploadOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    Subir videos
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setQueueRefreshKey((k) => k + 1)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
                <button
                  type="button"
                  disabled={processingQueue}
                  onClick={() => void runProcessNow()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                >
                  {processingQueue ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Procesar cola ahora
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!hideMainTabs ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMainTab('library')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              effectiveMainTab === 'library'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Film className="w-4 h-4" />
            Videos
          </button>
          <button
            type="button"
            onClick={() => setMainTab('queue')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              effectiveMainTab === 'queue'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ListVideo className="w-4 h-4" />
            Cola programados
          </button>
        </div>
      ) : null}

      {effectiveMainTab === 'queue' ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 px-5 py-4">
            <h2 className="text-lg font-extrabold text-gray-900">Cola de publicación</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Solo videos en bruto programados desde esta biblioteca. Edita, cancela o publica sin mezclar
              con el módulo Videos.
            </p>
          </div>
          <RawFullPublishingQueuePanel
            refreshKey={queueRefreshKey}
            onMutate={() => setQueueRefreshKey((k) => k + 1)}
          />
        </div>
      ) : (
        <>
          {!inventoryVehicleId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase text-gray-500">Videos</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{displayStats.totalVideos}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase text-gray-500">Peso (página)</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{formatBytes(displayStats.totalBytes)}</p>
              </div>
            </div>
          ) : null}

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                inventoryVehicleId
                  ? 'Buscar videos de este vehículo…'
                  : 'Buscar por título, marca, modelo, placa…'
              }
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm"
            />
          </div>

          {showPilarTabs ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Formato
              </p>
              <div className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80">
                {RAW_FULL_PILAR_TABS.map((tab) => {
                  const active = effectivePilarTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPilarTab(tab.id)}
                      className={[
                        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all',
                        active
                          ? tab.activeClass
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70',
                      ].join(' ')}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dotClass}`} />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">{tab.shortLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : videoCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <Film className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="mt-3 font-bold text-gray-800">
                {inventoryVehicleId
                  ? 'Sin videos en bruto para este vehículo'
                  : `Sin videos en ${lockedTabLabel}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {inventoryVehicleId
                  ? 'Usa Subir videos para asociar material de Video Autos a este auto.'
                  : effectivePilarTab === 'pilar1'
                    ? 'Aquí aparecen los videos de vehículos (con nombre del auto).'
                    : effectivePilarTab === 'pilar4'
                      ? 'Aquí van ganchos / POV sin vehículo.'
                      : 'Sube un video con el formato de esta pestaña.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {videoCards.map(({ folder, video }) => {
                const uploadedAt = video.createdAt || folder.createdAt
                const pilar = rawFullFolderToPilarTab(folder)
                const pilarMeta = RAW_FULL_PILAR_TABS.find((t) => t.id === pilar)
                const plate = folder.inventory?.plate?.trim() || null
                const captionHook = folder.caption?.trim().split('\n').find((line) => line.trim()) ?? ''
                return (
                  <article
                    key={video.path}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-video bg-slate-950">
                      {video.signedUrl ? (
                        <video
                          src={`${video.signedUrl}#t=0.1`}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                      {video.signedUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(video.signedUrl)}
                          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/35"
                          title="Previsualizar"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                            <Play className="ml-0.5 h-5 w-5 fill-slate-900 text-slate-900" />
                          </span>
                        </button>
                      ) : null}
                      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {formatBytes(video.sizeBytes)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pilarMeta ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PILAR_CHIP[pilarMeta.id]}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${pilarMeta.dotClass}`} />
                            {pilarMeta.shortLabel}
                          </span>
                        ) : null}
                        {plate ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-600">
                            {plate}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
                          {cardTitle(folder)}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">Subido {formatUploadDay(uploadedAt)}</p>
                      </div>
                      {captionHook ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{captionHook}</p>
                      ) : null}
                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!folder.caption?.trim()) {
                              toast.error(
                                'Este video no tiene caption. Sube de nuevo eligiendo formato o edita el copy al programar.'
                              )
                            }
                            setScheduleTarget({
                              folderId: folder.id,
                              videoPath: video.path,
                              caption: folder.caption?.trim() || '',
                              vehicleId: folder.inventoryVehicleId,
                            })
                          }}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Programar
                        </button>
                        {video.signedUrl ? (
                          <a
                            href={video.signedUrl}
                            download={video.name}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : null}
                        {!hideUploadButton ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAppendTarget({
                                id: folder.id,
                                title: folder.title,
                                videoCount: folder.videoCount,
                              })
                              setUploadOpen(true)
                            }}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            title="Agregar videos"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busyPath === video.path}
                          onClick={() => void handleDeleteVideo(folder.id, video.path)}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          title="Eliminar"
                        >
                          {busyPath === video.path ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      <UploadFullVideosModal
        isOpen={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setAppendTarget(null)
        }}
        existingFolder={appendTarget}
        onSaved={() => {
          void loadLibrary()
        }}
        onScheduled={() => {
          void loadLibrary()
          goToQueue()
        }}
      />

      <ScheduleRawFullPublishModal
        isOpen={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        folderId={scheduleTarget?.folderId ?? null}
        videoPath={scheduleTarget?.videoPath ?? null}
        initialCaption={scheduleTarget?.caption ?? ''}
        initialVehicleId={scheduleTarget?.vehicleId ?? null}
        onScheduled={() => {
          setScheduleTarget(null)
          goToQueue()
          toast.success('Programado — revisa la cola de esta biblioteca')
        }}
      />

      {previewUrl ? (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold"
            >
              Cerrar
            </button>
            <video src={previewUrl} className="w-full max-h-[80vh]" controls autoPlay playsInline />
          </div>
        </div>
      ) : null}
    </div>
  )
}
