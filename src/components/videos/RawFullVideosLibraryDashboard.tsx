'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Film,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBytes, type RawFullVideoFolderSummary, type RawFullVideoItem } from '@/lib/videos/raw-full-videos-library'
import { UploadFullVideosModal } from '@/components/videos/UploadFullVideosModal'

export function RawFullVideosLibraryDashboard() {
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '48' })
      if (debouncedQ) params.set('q', debouncedQ)
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
  }, [debouncedQ])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Marketing</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">Biblioteca de videos en bruto</h1>
          <p className="text-sm text-gray-600 mt-1">
            Videos enteros ya creados en otra herramienta. Storage separado de la biblioteca de clips.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadLibrary()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
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
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase text-gray-500">Carpetas</p>
          <p className="text-xl font-extrabold text-gray-900 mt-0.5">{stats.totalFolders}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase text-gray-500">Videos</p>
          <p className="text-xl font-extrabold text-gray-900 mt-0.5">{stats.totalVideos}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase text-gray-500">Peso (página)</p>
          <p className="text-xl font-extrabold text-gray-900 mt-0.5">{formatBytes(stats.totalBytes)}</p>
        </div>
      </div>

      {!selectedId ? (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por marca, modelo, placa…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="mt-3 font-bold text-gray-800">Sin carpetas aún</p>
              <p className="text-sm text-gray-500 mt-1">Sube videos enteros asociados a un vehículo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {folders.map((f) => (
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
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                <h2 className="text-lg font-extrabold text-gray-900">{detailFolder.title}</h2>
                {detailFolder.subtitle ? (
                  <p className="text-sm text-gray-500 mt-0.5">{detailFolder.subtitle}</p>
                ) : null}
                <p className="text-xs text-gray-600 mt-2">
                  {detailFolder.videoCount} video(s) · {formatBytes(detailFolder.totalBytes)}
                </p>
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
                        <p className="text-[11px] text-gray-500">{formatBytes(v.sizeBytes)}</p>
                        <div className="flex gap-2">
                          {v.signedUrl ? (
                            <a
                              href={v.signedUrl}
                              download={v.name}
                              className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-xl bg-violet-50 text-violet-800 text-xs font-bold hover:bg-violet-100"
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
