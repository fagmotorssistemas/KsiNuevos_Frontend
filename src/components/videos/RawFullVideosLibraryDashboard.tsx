'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  FolderOpen,
  Loader2,
  ListVideo,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Film,
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
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

type MainTab = 'library' | 'queue'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailFolder, setDetailFolder] = useState<RawFullVideoFolderSummary | null>(null)
  const [videos, setVideos] = useState<RawFullVideoItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
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

  useEffect(() => {
    setSelectedId(null)
    setDetailFolder(null)
    setVideos([])
  }, [inventoryVehicleId, lockedPilarTab])

  const filteredFolders = useMemo(() => {
    if (inventoryVehicleId) return folders
    return folders.filter((f) => rawFullFolderToPilarTab(f) === effectivePilarTab)
  }, [folders, effectivePilarTab, inventoryVehicleId])

  const displayStats = useMemo(() => {
    if (!lockedPilarTab && !inventoryVehicleId) return stats
    return {
      totalFolders: filteredFolders.length,
      totalVideos: filteredFolders.reduce((sum, f) => sum + f.videoCount, 0),
      totalBytes: filteredFolders.reduce((sum, f) => sum + f.totalBytes, 0),
    }
  }, [filteredFolders, inventoryVehicleId, lockedPilarTab, stats])

  const loadDetail = useCallback(async (folderId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/videos/raw-full/library/${folderId}`, { credentials: 'include' })
      const data = (await res.json()) as {
        error?: string
        folder?: RawFullVideoFolderSummary
        videos?: RawFullVideoItem[]
      }
      if (!res.ok || !data.folder) throw new Error(data.error ?? 'Carpeta no encontrada')
      setDetailFolder(data.folder)
      setVideos(data.videos ?? [])
      setSelectedId(folderId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando carpeta')
      setSelectedId(null)
      setDetailFolder(null)
      setVideos([])
    } finally {
      setDetailLoading(false)
    }
  }, [])

  async function handleDeleteVideo(path: string) {
    if (!selectedId) return
    if (!confirm('¿Eliminar este video de la biblioteca?')) return
    setBusyPath(path)
    try {
      const res = await fetch(`/api/videos/raw-full/library/${selectedId}/videos`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = (await res.json()) as { error?: string; folderDeleted?: boolean }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar')
      toast.success('Video eliminado')
      if (data.folderDeleted) {
        setSelectedId(null)
        setDetailFolder(null)
        setVideos([])
        void loadLibrary()
      } else {
        void loadDetail(selectedId)
        void loadLibrary()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setBusyPath(null)
    }
  }

  async function handleDeleteFolder() {
    if (!selectedId || !detailFolder) return
    if (!confirm(`¿Eliminar la carpeta "${detailFolder.title}" y todos sus videos?`)) return
    try {
      const res = await fetch(`/api/videos/raw-full/library/${selectedId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar')
      toast.success('Carpeta eliminada')
      setSelectedId(null)
      setDetailFolder(null)
      setVideos([])
      void loadLibrary()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
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
            onClick={() => {
              setMainTab('library')
              setSelectedId(null)
              setDetailFolder(null)
              setVideos([])
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              effectiveMainTab === 'library'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Carpetas
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase text-gray-500">Carpetas</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{displayStats.totalFolders}</p>
              </div>
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

          {!selectedId ? (
            <>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    inventoryVehicleId
                      ? 'Buscar carpeta de este vehículo…'
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
              ) : filteredFolders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                  <FolderOpen className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="mt-3 font-bold text-gray-800">
                    {inventoryVehicleId
                      ? 'Sin videos en bruto para este vehículo'
                      : `Sin carpetas en ${lockedTabLabel}`}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => void loadDetail(f.id)}
                      className="text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{f.title}</p>
                          {f.subtitle ? (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{f.subtitle}</p>
                          ) : null}
                          <p className="text-xs text-gray-600 mt-2">
                            {f.videoCount} video{f.videoCount === 1 ? '' : 's'} · {formatBytes(f.totalBytes)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null)
                    setDetailFolder(null)
                    setVideos([])
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!detailFolder) return
                    setAppendTarget({
                      id: detailFolder.id,
                      title: detailFolder.title,
                      videoCount: detailFolder.videoCount,
                    })
                    setUploadOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
                >
                  <Upload className="w-4 h-4" />
                  Agregar videos
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteFolder()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar carpeta
                </button>
              </div>

              {detailLoading || !detailFolder ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-2">
                    <h2 className="text-lg font-extrabold text-gray-900">{detailFolder.title}</h2>
                    {detailFolder.subtitle ? (
                      <p className="text-sm text-gray-500 mt-0.5">{detailFolder.subtitle}</p>
                    ) : null}
                    <p className="text-xs text-gray-600">
                      {detailFolder.videoCount} video(s) · {formatBytes(detailFolder.totalBytes)} · Subido{' '}
                      {formatUploadDay(detailFolder.createdAt)}
                    </p>
                    {detailFolder.formato || detailFolder.folderName ? (
                      <p className="text-xs font-semibold text-slate-700">
                        Tema:{' '}
                        {[detailFolder.subtitle, detailFolder.folderName]
                          .filter(Boolean)
                          .filter((x, i, arr) => arr.indexOf(x) === i)
                          .join(' · ') || detailFolder.title}
                      </p>
                    ) : null}
                    {detailFolder.caption ? (
                      <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4 border-t border-gray-100 pt-2">
                        {detailFolder.caption}
                      </p>
                    ) : null}
                  </div>

                  {videos.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Esta carpeta no tiene videos.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((v) => (
                        <div
                          key={v.path}
                          className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
                        >
                          <div className="relative h-44 bg-gray-900">
                            {v.signedUrl ? (
                              <video
                                src={`${v.signedUrl}#t=0.1`}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                            {v.signedUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewUrl(v.signedUrl)}
                                className="absolute inset-0 bg-black/10 hover:bg-black/30 transition-colors"
                                title="Previsualizar"
                              />
                            ) : null}
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-800 truncate" title={v.name}>
                              {v.name}
                            </p>
                            {detailFolder.title || detailFolder.subtitle ? (
                              <p className="text-[11px] text-slate-600 truncate" title={detailFolder.title}>
                                {detailFolder.subtitle || detailFolder.title}
                              </p>
                            ) : null}
                            <p className="text-[11px] text-gray-500">{formatBytes(v.sizeBytes)}</p>
                            {v.createdAt ? (
                              <p className="text-[11px] text-violet-700 font-semibold capitalize">
                                Subido {formatUploadDay(v.createdAt)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-violet-700 font-semibold capitalize">
                                Subido {formatUploadDay(detailFolder.createdAt)}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!detailFolder) return
                                  if (!detailFolder.caption?.trim()) {
                                    toast.error(
                                      'Esta carpeta no tiene caption. Sube de nuevo eligiendo formato o edita el copy al programar.'
                                    )
                                  }
                                  setScheduleTarget({
                                    folderId: detailFolder.id,
                                    videoPath: v.path,
                                    caption: detailFolder.caption?.trim() || '',
                                    vehicleId: detailFolder.inventoryVehicleId,
                                  })
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Programar
                              </button>
                              {v.signedUrl ? (
                                <a
                                  href={v.signedUrl}
                                  download={v.name}
                                  className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl bg-violet-50 text-violet-800 text-xs font-bold hover:bg-violet-100"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Descargar
                                </a>
                              ) : null}
                              <button
                                type="button"
                                disabled={busyPath === v.path}
                                onClick={() => void handleDeleteVideo(v.path)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                title="Eliminar"
                              >
                                {busyPath === v.path ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
          if (selectedId) void loadDetail(selectedId)
        }}
        onScheduled={() => {
          void loadLibrary()
          if (selectedId) void loadDetail(selectedId)
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
