'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Film,
  Folder,
  FolderOpen,
  HardDrive,
  Layers,
  Loader2,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateReelModal } from '@/components/videos/CreateReelModal'
import { UploadLibraryClipsModal } from '@/components/videos/UploadLibraryClipsModal'
import type { ReelLibraryDraft } from '@/lib/videos/reel-library-draft'
import type {
  RawClipItem,
  RawClipsFolderSummary,
  RawClipsLibraryStats,
} from '@/lib/videos/raw-clips-types'
import { formatBytes } from '@/lib/videos/resolve-job-vehicle'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'

type LibraryResponse = {
  folders: RawClipsFolderSummary[]
  stats: RawClipsLibraryStats
  page: number
  pageSize: number
  total: number
}

type DetailResponse = {
  folder: RawClipsFolderSummary
  clips: RawClipItem[]
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completados' },
  { value: 'failed', label: 'Errores' },
  { value: 'rendering', label: 'Renderizando' },
  { value: 'uploading', label: 'Subiendo' },
] as const

const STATUS_BADGE: Record<string, { label: string; className: string; dot: string }> = {
  completed: { label: 'Completado', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  failed: { label: 'Error', className: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  uploading: { label: 'Subiendo', className: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  transcribing: { label: 'Transcribiendo', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  analyzing: { label: 'Analizando', className: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  rendering: { label: 'Renderizando', className: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  pending: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

function formatUploadDate(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso))
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function statusBadge(status: string) {
  return STATUS_BADGE[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  }
}

function FolderCard({
  folder,
  selected,
  onSelect,
}: {
  folder: RawClipsFolderSummary
  selected: boolean
  onSelect: () => void
}) {
  const badge = statusBadge(folder.status)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
        selected
          ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/25 scale-[1.01]'
          : 'border-gray-200 bg-white hover:border-violet-200 hover:shadow-md'
      }`}
    >
      <div
        className={`mb-4 flex h-24 items-center justify-center rounded-xl ${
          selected ? 'bg-violet-500/40' : 'bg-slate-50 group-hover:bg-violet-50'
        }`}
      >
        {selected ? (
          <FolderOpen className="h-14 w-14 text-white/90" strokeWidth={1.25} />
        ) : (
          <Folder className="h-14 w-14 text-slate-300 group-hover:text-violet-400" strokeWidth={1.25} />
        )}
      </div>
      <h3
        className={`line-clamp-2 text-sm font-bold leading-snug ${
          selected ? 'text-white' : 'text-gray-900'
        }`}
      >
        {folder.title}
      </h3>
      {folder.subtitle ? (
        <p className={`mt-1 text-xs ${selected ? 'text-violet-100' : 'text-gray-500'}`}>
          {folder.subtitle}
        </p>
      ) : null}
      <p
        className={`mt-2 font-mono text-[10px] tracking-tight ${
          selected ? 'text-violet-200/90' : 'text-gray-400'
        }`}
      >
        Job {shortId(folder.id)}
        {folder.inventoryVehicleId ? (
          <>
            <span className={selected ? 'text-violet-300/60' : 'text-gray-300'}> · </span>
            Inv. {shortId(folder.inventoryVehicleId)}
          </>
        ) : null}
      </p>
      <div
        className={`mt-3 flex items-center justify-between text-xs font-medium ${
          selected ? 'text-violet-100' : 'text-gray-500'
        }`}
      >
        <span>{folder.clipCount} clips</span>
        <span>{formatBytes(folder.totalBytes)}</span>
      </div>
      <p className={`mt-1 text-[11px] ${selected ? 'text-violet-200' : 'text-gray-400'}`}>
        Subido {formatUploadDate(folder.createdAt)}
      </p>
      {!selected && (
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      )}
    </button>
  )
}

function InfoSidebar({
  folder,
  clips,
  loadingClips,
  onUseForNewReel,
  onDeleteClip,
  deletingClipPath,
  onAddClips,
  canAddClips,
}: {
  folder: RawClipsFolderSummary | null
  clips: RawClipItem[]
  loadingClips: boolean
  onUseForNewReel?: () => void
  onDeleteClip?: (clip: RawClipItem) => void
  deletingClipPath?: string | null
  onAddClips?: () => void
  canAddClips?: boolean
}) {
  if (!folder) {
    return (
      <aside className="hidden w-80 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:flex">
        <h2 className="text-sm font-bold text-gray-900">Info</h2>
        <p className="mt-4 text-sm text-gray-500">
          Selecciona una carpeta para ver propiedades, clips en bruto y enlace al reel editado.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Clips en bruto</p>
            <p className="mt-1 text-sm text-gray-600">
              Material fuente subido para la fábrica de Reels, antes de Creatomate.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  const badge = statusBadge(folder.status)
  const tags: { label: string; color: string }[] = [
    { label: badge.label, color: 'bg-violet-500' },
    { label: folder.flowType === 'multiple' ? 'Multi-clip' : 'Single', color: 'bg-sky-500' },
  ]
  if (folder.inventory?.status) {
    tags.push({ label: folder.inventory.status, color: 'bg-emerald-500' })
  }
  if (folder.socialPublishStage) {
    tags.push({ label: folder.socialPublishStage, color: 'bg-amber-500' })
  }

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm xl:w-80">
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-900">Info</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Carpeta</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{folder.title}</p>
          {folder.subtitle ? (
            <p className="text-xs text-gray-500">{folder.subtitle}</p>
          ) : null}
          <p className="mt-1 font-mono text-[11px] text-gray-400">
            Job {folder.id}
            {folder.inventoryVehicleId ? (
              <>
                <br />
                Inventario {folder.inventoryVehicleId}
              </>
            ) : null}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tamaño</span>
            <span className="font-medium text-gray-900">{formatBytes(folder.totalBytes)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Clips</span>
            <span className="font-medium text-gray-900">{folder.clipCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Creado</span>
            <span className="text-right font-medium text-gray-900">{formatDate(folder.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Última modificación</span>
            <span className="text-right font-medium text-gray-900">{formatDate(folder.updatedAt)}</span>
          </div>
        </div>

        {folder.inventory ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Inventario</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {folder.inventory.brand} {folder.inventory.model} {folder.inventory.year}
            </p>
            {folder.inventory.plate ? (
              <p className="text-xs text-gray-600">{folder.inventory.plate}</p>
            ) : null}
          </div>
        ) : folder.vehicleLine2 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vehículo (texto)</p>
            <p className="mt-1 text-sm text-gray-800">{folder.vehicleLine2}</p>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Etiquetas</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${t.color}`} />
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canAddClips && onAddClips ? (
            <button
              type="button"
              onClick={onAddClips}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-100"
            >
              <Plus className="h-4 w-4" />
              Agregar clips
            </button>
          ) : null}
          <button
            type="button"
            onClick={onUseForNewReel}
            disabled={loadingClips || clips.length === 0 || !onUseForNewReel}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Usar clips para nuevo reel
          </button>
          <Link
            href={`/marketing/videos/${folder.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Film className="h-4 w-4" />
            Ver job / reel
          </Link>
          {folder.finalVideoUrl ? (
            <a
              href={folder.finalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <ExternalLink className="h-4 w-4" />
              Reel editado
            </a>
          ) : null}
        </div>

        {loadingClips ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando clips…
          </div>
        ) : clips.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Archivos ({clips.length})
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-gray-600">
              {clips.map((c) => (
                <li
                  key={c.path}
                  className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {c.clipIndex != null ? `#${c.clipIndex + 1} · ` : ''}
                    {c.name}
                  </span>
                  {onDeleteClip ? (
                    <button
                      type="button"
                      onClick={() => onDeleteClip(c)}
                      disabled={deletingClipPath === c.path}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Eliminar clip"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      {deletingClipPath === c.path ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function ClipPreviewCard({
  clip,
  onDelete,
  deleting,
}: {
  clip: RawClipItem
  onDelete?: () => void
  deleting?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  async function handlePlayClick() {
    const video = videoRef.current
    if (!video) return
    try {
      await video.play()
    } catch {
      // Política del navegador o clip aún cargando
    }
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative aspect-[9/16] max-h-[320px] w-full bg-black">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="absolute right-2 top-2 z-10 rounded-lg bg-black/50 p-1.5 text-white/80 opacity-0 transition-opacity hover:bg-red-600 hover:text-white group-hover:opacity-100 disabled:opacity-50"
            title="Eliminar clip"
            aria-label={`Eliminar ${clip.name}`}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        ) : null}
        <video
          ref={videoRef}
          src={clip.signedUrl}
          className="h-full w-full object-contain"
          controls={playing}
          preload="metadata"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label="Reproducir clip"
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="h-5 w-5 text-violet-600" fill="currentColor" />
            </div>
          </button>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-xs font-semibold text-gray-900" title={clip.name}>
          {clip.clipIndex != null ? `Clip ${clip.clipIndex + 1}` : 'Clip'} · {clip.name}
        </p>
        <p className="text-[11px] text-gray-500">{formatBytes(clip.sizeBytes)}</p>
      </div>
    </div>
  )
}

function DeleteClipConfirmModal({
  clip,
  open,
  deleting,
  onClose,
  onConfirm,
}: {
  clip: RawClipItem | null
  open: boolean
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open || !clip) return null

  const label =
    clip.clipIndex != null ? `Clip ${clip.clipIndex + 1} · ${clip.name}` : clip.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-clip-title"
      >
        <div className="flex items-start gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-clip-title" className="text-lg font-bold text-gray-900">
              ¿Eliminar este clip?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              ¿Estás seguro de que quieres eliminar{' '}
              <span className="font-semibold text-gray-900">{label}</span> ({formatBytes(clip.sizeBytes)})?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export type RawClipsLibraryDashboardProps = {
  /** Filtra carpetas al vehículo del inventario. */
  inventoryVehicleId?: string
  /** Título del vehículo (modo embebido). */
  vehicleTitle?: string
  /** Modo embebido desde Inventariado marketing. */
  embedded?: boolean
  /** Oculta título/descripción (cuando el padre ya los muestra). */
  hideHeader?: boolean
  /** Subtítulo de sección cuando `hideHeader`. */
  sectionTitle?: string
  onBack?: () => void
}

export function RawClipsLibraryDashboard({
  inventoryVehicleId,
  vehicleTitle,
  embedded = false,
  hideHeader = false,
  sectionTitle,
  onBack,
}: RawClipsLibraryDashboardProps = {}) {
  const [folders, setFolders] = useState<RawClipsFolderSummary[]>([])
  const [stats, setStats] = useState<RawClipsLibraryStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(24)
  const [q, setQ] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<RawClipsFolderSummary | null>(null)
  const [clips, setClips] = useState<RawClipItem[]>([])
  const [loadingClips, setLoadingClips] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'folder'>('grid')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<{
    id: string
    title: string
    clipCount: number
  } | null>(null)
  const [reelLibraryDraft, setReelLibraryDraft] = useState<ReelLibraryDraft | null>(null)
  const [clipToDelete, setClipToDelete] = useState<RawClipItem | null>(null)
  const [deletingClip, setDeletingClip] = useState(false)

  function buildReelDraft(folder: RawClipsFolderSummary, clipItems: RawClipItem[]): ReelLibraryDraft {
    return {
      sourceJobId: folder.id,
      folderTitle: folder.title,
      clips: clipItems.map((c) => ({
        path: c.path,
        name: c.name,
        signedUrl: c.signedUrl,
        sizeBytes: c.sizeBytes,
        clipIndex: c.clipIndex,
      })),
      vehicleId: folder.inventoryVehicleId ?? folder.vehicleId,
      vehicleLine2: folder.vehicleLine2 ?? folder.inventory?.model ?? null,
      jobName: folder.jobName ?? folder.title,
      ...(folder.inventory
        ? {
            vehicleLine1: folder.inventory.brand,
            vehicleLine2: folder.inventory.model,
            vehicleLine4: String(folder.inventory.year),
          }
        : {}),
    }
  }

  function handleUseClipsForNewReel() {
    const folder = selectedFolder ?? selectedFromList
    if (!folder || clips.length === 0) return
    setReelLibraryDraft(buildReelDraft(folder, clips))
    setIsCreateModalOpen(true)
  }

  const selectedFromList = useMemo(
    () => folders.find((f) => f.id === selectedId) ?? null,
    [folders, selectedId]
  )

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status,
      })
      if (q.trim()) params.set('q', q.trim())
      if (inventoryVehicleId?.trim()) params.set('inventoryVehicleId', inventoryVehicleId.trim())

      const res = await fetch(`/api/videos/raw-clips/library?${params}`)
      const data = (await res.json()) as LibraryResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error cargando biblioteca')

      setFolders(data.folders)
      setStats(data.stats)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, q, status, inventoryVehicleId])

  const loadFolderDetail = useCallback(async (jobId: string) => {
    setLoadingClips(true)
    try {
      const res = await fetch(`/api/videos/raw-clips/library/${jobId}`)
      const data = (await res.json()) as DetailResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error cargando carpeta')
      setSelectedFolder(data.folder)
      setClips(data.clips)
    } catch (err) {
      console.error(err)
      setClips([])
    } finally {
      setLoadingClips(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
    setSelectedFolder(null)
    setClips([])
    setViewMode('grid')
  }, [inventoryVehicleId])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    if (!selectedId) {
      setSelectedFolder(null)
      setClips([])
      return
    }
    void loadFolderDetail(selectedId)
  }, [selectedId, loadFolderDetail])

  function handleSelectFolder(folder: RawClipsFolderSummary) {
    setSelectedId(folder.id)
    setSelectedFolder(folder)
    setViewMode('folder')
  }

  function handleBackToGrid() {
    setViewMode('grid')
    setSelectedId(null)
    setSelectedFolder(null)
    setClips([])
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setQ(searchInput)
  }

  function requestDeleteClip(clip: RawClipItem) {
    setClipToDelete(clip)
  }

  async function handleConfirmDeleteClip() {
    const jobId = selectedId ?? activeFolder?.id
    if (!clipToDelete || !jobId) return
    setDeletingClip(true)
    try {
      const res = await fetch(`/api/videos/raw-clips/library/${jobId}/clips`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: clipToDelete.path }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        folderDeleted?: boolean
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar el clip')

      toast.success(`Clip eliminado`)

      if (data.folderDeleted) {
        handleBackToGrid()
        setClipToDelete(null)
        void loadLibrary()
        return
      }

      setClipToDelete(null)
      void loadFolderDetail(jobId)
      void loadLibrary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingClip(false)
    }
  }

  function openNewFolderUpload() {
    setUploadTargetFolder(null)
    setIsUploadModalOpen(true)
  }

  function openAddClipsToFolder(folder: RawClipsFolderSummary) {
    setUploadTargetFolder({
      id: folder.id,
      title: folder.title,
      clipCount: clips.length || folder.clipCount,
    })
    setIsUploadModalOpen(true)
  }

  function handleUploadModalClose() {
    setIsUploadModalOpen(false)
    setUploadTargetFolder(null)
  }

  const activeFolder = selectedFolder ?? selectedFromList
  const canAddMoreClips =
    !!activeFolder && (clips.length || activeFolder.clipCount) < VIDEO_MAX_CLIPS
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const pageTitle =
    viewMode === 'folder' && activeFolder
      ? activeFolder.title
      : embedded && vehicleTitle && !hideHeader
        ? `Clips · ${vehicleTitle}`
        : sectionTitle ?? 'Biblioteca de clips'

  const showFullPageHeader = !hideHeader || viewMode === 'folder'
  const showSectionIntro = hideHeader && viewMode === 'grid' && !!sectionTitle

  return (
    <div
      className={
        embedded
          ? 'flex min-h-[420px] flex-col'
          : '-mx-4 flex min-h-[calc(100vh-8rem)] flex-col md:-mx-8'
      }
    >
      <div className={`flex flex-1 flex-col gap-6 ${embedded ? '' : 'px-4 md:px-8'} xl:flex-row`}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Breadcrumbs */}
          {!embedded ? (
            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
              <Link href="/marketing" className="hover:text-violet-600">
                Marketing
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0" />
              {viewMode === 'folder' && activeFolder ? (
                <>
                  <button
                    type="button"
                    onClick={handleBackToGrid}
                    className="hover:text-violet-600"
                  >
                    Biblioteca de clips
                  </button>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-gray-900 line-clamp-1">{activeFolder.title}</span>
                </>
              ) : (
                <span className="font-medium text-gray-900">Biblioteca de clips</span>
              )}
            </nav>
          ) : null}

          {/* Section intro (modo embebido sin cabecera completa) */}
          {showSectionIntro ? (
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-gray-900">{sectionTitle}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Carpetas con material fuente subido para generar reels de este vehículo.
              </p>
            </div>
          ) : null}

          {/* Header */}
          {showFullPageHeader ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{pageTitle}</h1>
              {!hideHeader ? (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {embedded ? (
                  <>
                    Clips en bruto vinculados a este vehículo. Selecciona una carpeta para ver el material fuente de
                    cada reel.
                  </>
                ) : (
                  <>
                    Clips en bruto subidos para la fábrica de Reels. Cada carpeta corresponde a un job de{' '}
                    <Link href="/marketing/videos" className="font-medium text-violet-600 hover:underline">
                      Videos
                    </Link>
                    .
                  </>
                )}
              </p>
              ) : viewMode === 'folder' ? (
                <p className="mt-1 text-sm text-gray-500">Material fuente de esta carpeta.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              {embedded && onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inventario
                </button>
              ) : null}
              {viewMode === 'grid' && !embedded ? (
                <button
                  type="button"
                  onClick={openNewFolderUpload}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                  title="Subir clips a biblioteca"
                  aria-label="Subir clips a biblioteca"
                >
                  <Plus className="h-5 w-5" />
                </button>
              ) : null}
              {viewMode === 'folder' && activeFolder && canAddMoreClips ? (
                <button
                  type="button"
                  onClick={() => openAddClipsToFolder(activeFolder)}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4" />
                  Agregar clips
                </button>
              ) : null}
              {viewMode === 'folder' ? (
                <button
                  type="button"
                  onClick={handleBackToGrid}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Todas las carpetas
                </button>
              ) : null}
            </div>
          </div>
          ) : null}

          {/* Stats */}
          {stats && viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                    <Folder className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900">{stats.totalFolders}</p>
                    <p className="text-xs text-gray-500">carpetas</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
                    <Layers className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900">{stats.totalClips}</p>
                    <p className="text-xs text-gray-500">clips en bruto</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <HardDrive className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900">{formatBytes(stats.totalBytes)}</p>
                    <p className="text-xs text-gray-500">almacenamiento</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Toolbar */}
          {viewMode === 'grid' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    embedded
                      ? 'Buscar por nombre de job o estado…'
                      : 'Buscar por vehículo, placa, nombre o estado…'
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </form>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="hidden h-4 w-4 text-gray-400 sm:block" />
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-violet-400 focus:outline-none"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {/* Content */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    selected={selectedId === folder.id}
                    onSelect={() => handleSelectFolder(folder)}
                  />
                ))}
              </div>

              {folders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-500">
                  {embedded
                    ? 'No hay clips en bruto vinculados a este vehículo.'
                    : 'No hay carpetas que coincidan con la búsqueda.'}
                </div>
              ) : null}

              {totalPages > 1 ? (
                <div className="flex items-center justify-center gap-3 pb-8">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="pb-8">
              {loadingClips ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 py-16 text-center">
                  <p className="text-sm text-gray-500">No se encontraron clips en esta carpeta.</p>
                  {activeFolder && canAddMoreClips ? (
                    <button
                      type="button"
                      onClick={() => openAddClipsToFolder(activeFolder)}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar clips
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {clips.map((clip) => (
                    <ClipPreviewCard
                      key={clip.path}
                      clip={clip}
                      onDelete={() => requestDeleteClip(clip)}
                      deleting={deletingClip && clipToDelete?.path === clip.path}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <InfoSidebar
          folder={activeFolder}
          clips={clips}
          loadingClips={loadingClips}
          onUseForNewReel={activeFolder && clips.length > 0 ? handleUseClipsForNewReel : undefined}
          onDeleteClip={activeFolder && clips.length > 0 ? requestDeleteClip : undefined}
          deletingClipPath={deletingClip ? clipToDelete?.path ?? null : null}
          onAddClips={
            activeFolder && canAddMoreClips ? () => openAddClipsToFolder(activeFolder) : undefined
          }
          canAddClips={canAddMoreClips}
        />
      </div>

      <CreateReelModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setReelLibraryDraft(null)
        }}
        onJobCreated={() => {
          void loadLibrary()
          if (selectedId) void loadFolderDetail(selectedId)
        }}
        initialLibraryDraft={reelLibraryDraft}
      />

      <UploadLibraryClipsModal
        isOpen={isUploadModalOpen}
        onClose={handleUploadModalClose}
        existingFolder={uploadTargetFolder}
        onSaved={() => {
          if (uploadTargetFolder) {
            void loadFolderDetail(uploadTargetFolder.id)
          } else {
            setPage(1)
          }
          void loadLibrary()
        }}
      />

      <DeleteClipConfirmModal
        clip={clipToDelete}
        open={!!clipToDelete}
        deleting={deletingClip}
        onClose={() => {
          if (!deletingClip) setClipToDelete(null)
        }}
        onConfirm={() => void handleConfirmDeleteClip()}
      />
    </div>
  )
}
