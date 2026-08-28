'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ClipboardList,
  Loader2,
  Search,
  ArrowDownWideNarrow,
  Filter,
  AlertTriangle,
  Film,
  ArrowLeft,
  FolderOpen,
  Plus,
  Inbox,
  ListVideo,
  GraduationCap,
  Sparkles,
  Heart,
  PlayCircle,
  Image as ImageIcon,
} from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import {
  InventoryKpiStats,
  type InventoryKpiFilter,
  type InventoryKpiSummary,
} from '@/components/features/inventory/InventoryKpiStats'
import { RawClipsLibraryDashboard } from '@/components/videos/RawClipsLibraryDashboard'
import { RawFullVideosLibraryDashboard } from '@/components/videos/RawFullVideosLibraryDashboard'
import { UploadFullVideosModal } from '@/components/videos/UploadFullVideosModal'
import { UploadInboxVideosModal } from '@/components/videos/UploadInboxVideosModal'
import { MarketingInboxVideosPanel } from '@/components/videos/MarketingInboxVideosPanel'
import { VideoJobList } from '@/components/videos/VideoJobList'
import { VehicleAiCreativesGallery } from '@/components/marketing/VehicleAiCreativesGallery'
import type { RawFullCaptionFormato } from '@/lib/videos/raw-full-caption-templates'

type Row = {
  id: string
  brand: string
  model: string
  year: number
  version: string | null
  status: string | null
  updated_at: string | null
  plate: string | null
  uniqueGenerated: number
  uniquePublished: number
  uniquePending: number
  uniqueFailed: number
  uniqueCancelled: number
}

const PAGE_SIZE = 25

const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
  devuelto: 'Devuelto',
  mantenimiento: 'Mantenimiento',
  consignacion: 'Consignación',
  conwilsonhernan: 'Con Wilson Hernán',
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatStatus(status: string | null) {
  if (!status) return '—'
  return STATUS_LABELS[status] ?? toTitleCase(status.replace(/_/g, ' '))
}

function formatVehicleTitle(row: Row) {
  return `${toTitleCase(row.brand)} ${toTitleCase(row.model)} ${row.year}`
}

type PageTab = 'inventario' | 'educativo' | 'entretenimiento' | 'humanizar' | 'bandeja' | 'cola' | 'vehiculo'
type VehicleDetailTab = 'reels' | 'raw-clips' | 'raw-full' | 'ai-gallery'

function tabButtonClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? 'bg-white text-violet-700 border border-gray-200 border-b-white -mb-px shadow-sm'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
  }`
}

export default function InventariadoMarketingPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capped, setCapped] = useState(false)
  const [kpiSummary, setKpiSummary] = useState<InventoryKpiSummary | null>(null)
  const [kpiLoading, setKpiLoading] = useState(true)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [inventoryStatus, setInventoryStatus] = useState('all')
  const [coverage, setCoverage] = useState<
    'all' | 'with_generated' | 'without_generated' | 'with_published' | 'without_published'
  >('all')
  const [sort, setSort] = useState(
    'generated_desc' as
      | 'generated_desc'
      | 'generated_asc'
      | 'published_desc'
      | 'published_asc'
      | 'pending_desc'
      | 'failed_desc'
      | 'brand_asc'
      | 'updated_desc'
  )

  const [activeTab, setActiveTab] = useState<PageTab>('inventario')
  const [vehicleDetailTab, setVehicleDetailTab] = useState<VehicleDetailTab>('reels')
  const [selectedVehicle, setSelectedVehicle] = useState<Row | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [inboxUploadOpen, setInboxUploadOpen] = useState(false)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0)

  const lastFilterSig = useRef<string | null>(null)
  const pendingFilterReset = useRef(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 350)
    return () => window.clearTimeout(t)
  }, [q])

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: String(PAGE_SIZE),
          inventoryStatus,
          coverage,
          sort,
        })
        if (debouncedQ) params.set('q', debouncedQ)

        const res = await fetch(`/api/marketing/inventory-video-dashboard?${params.toString()}`, {
          credentials: 'include',
        })
        const data = (await res.json()) as {
          rows?: Row[]
          total?: number
          totalPages?: number
          page?: number
          capped?: boolean
          kpiSummary?: InventoryKpiSummary
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
        setRows(data.rows ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(Math.max(1, data.totalPages ?? 1))
        setCapped(!!data.capped)
        if (data.kpiSummary) {
          setKpiSummary(data.kpiSummary)
          setKpiLoading(false)
        }
        if (data.page && data.page !== pageNum) setPage(data.page)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar')
        setRows([])
        setTotal(0)
        setKpiLoading(false)
      } finally {
        setLoading(false)
      }
    },
    [debouncedQ, inventoryStatus, coverage, sort]
  )

  useEffect(() => {
    const sig = `${debouncedQ}|${inventoryStatus}|${coverage}|${sort}`
    if (lastFilterSig.current !== sig) {
      lastFilterSig.current = sig
      void fetchPage(1)
      if (page !== 1) {
        pendingFilterReset.current = true
        setPage(1)
      }
      return
    }
    if (pendingFilterReset.current && page === 1) {
      pendingFilterReset.current = false
      return
    }
    void fetchPage(page)
  }, [page, debouncedQ, inventoryStatus, coverage, sort, fetchPage, libraryRefreshKey])

  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(page * PAGE_SIZE, total)

  const activeKpiFilter: InventoryKpiFilter =
    inventoryStatus === 'disponible' ? 'active' : inventoryStatus === 'vendido' ? 'baja' : 'all'

  function handleKpiFilterChange(filter: InventoryKpiFilter) {
    if (filter === 'active') setInventoryStatus('disponible')
    else if (filter === 'baja') setInventoryStatus('vendido')
    else setInventoryStatus('all')
    setActiveTab('inventario')
  }

  function handleVehicleSelect(row: Row) {
    setSelectedVehicle(row)
    setVehicleDetailTab('reels')
    setActiveTab('vehiculo')
  }

  function handleBackToInventory() {
    setActiveTab('inventario')
  }

  function openQueueTab() {
    setActiveTab('cola')
    setLibraryRefreshKey((k) => k + 1)
  }

  function uploadFormato(): RawFullCaptionFormato {
    if (activeTab === 'educativo') return 'video_educativo'
    if (activeTab === 'entretenimiento') return 'video_entretenimiento'
    if (activeTab === 'humanizar') return 'video_humanizar'
    return 'video_autos'
  }

  const selectedVehicleTitle = selectedVehicle ? formatVehicleTitle(selectedVehicle) : null
  const uploadVehicleId =
    activeTab === 'vehiculo' && selectedVehicle ? selectedVehicle.id : null

  const rawFullEmbed = {
    embedded: true as const,
    hideHeader: true,
    hideMainTabs: true,
    hideUploadButton: true,
    refreshKey: libraryRefreshKey,
    onOpenQueue: openQueueTab,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Inventariado marketing</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Inventario con reels, clips y videos en bruto por vehículo. El contenido educativo, de
              entretenimiento y de marca está en las pestañas de esta misma página.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Subir videos
          </button>
          <button
            type="button"
            onClick={() => setInboxUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
          >
            <Inbox className="w-4 h-4" />
            Subir material
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <InventoryKpiStats
          data={kpiSummary}
          loading={kpiLoading && !kpiSummary}
          activeFilter={activeKpiFilter}
          onFilterChange={handleKpiFilterChange}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('inventario')}
          className={tabButtonClass(activeTab === 'inventario')}
        >
          <ClipboardList className="w-4 h-4" />
          Inventario
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('educativo')}
          className={tabButtonClass(activeTab === 'educativo')}
        >
          <GraduationCap className="w-4 h-4" />
          Video Educativo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('entretenimiento')}
          className={tabButtonClass(activeTab === 'entretenimiento')}
        >
          <Sparkles className="w-4 h-4" />
          Video Entretenimiento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('humanizar')}
          className={tabButtonClass(activeTab === 'humanizar')}
        >
          <Heart className="w-4 h-4" />
          Video Humanizar Marca
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bandeja')}
          className={tabButtonClass(activeTab === 'bandeja')}
        >
          <Inbox className="w-4 h-4" />
          Bandeja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cola')}
          className={tabButtonClass(activeTab === 'cola')}
        >
          <ListVideo className="w-4 h-4" />
          Cola programados
        </button>
        {selectedVehicle ? (
          <button
            type="button"
            onClick={() => setActiveTab('vehiculo')}
            className={tabButtonClass(activeTab === 'vehiculo')}
          >
            <Film className="w-4 h-4 shrink-0" />
            Vehículo
          </button>
        ) : null}
      </div>

      {activeTab === 'vehiculo' && selectedVehicle ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-4 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBackToInventory}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                aria-label="Volver al inventario"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">
                  {selectedVehicleTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-gray-500">
                  {selectedVehicle.plate ? <span>Placa {selectedVehicle.plate}</span> : null}
                  {selectedVehicle.plate && selectedVehicle.status ? (
                    <span className="text-gray-300">·</span>
                  ) : null}
                  {selectedVehicle.status ? (
                    <span className="inline-flex font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {formatStatus(selectedVehicle.status)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setVehicleDetailTab('reels')}
              className={tabButtonClass(vehicleDetailTab === 'reels')}
            >
              <Film className="w-4 h-4" />
              Reels
            </button>
            <button
              type="button"
              onClick={() => setVehicleDetailTab('raw-clips')}
              className={tabButtonClass(vehicleDetailTab === 'raw-clips')}
            >
              <FolderOpen className="w-4 h-4" />
              Clips en bruto
            </button>
            <button
              type="button"
              onClick={() => setVehicleDetailTab('raw-full')}
              className={tabButtonClass(vehicleDetailTab === 'raw-full')}
            >
              <PlayCircle className="w-4 h-4" />
              Videos en bruto
            </button>
            <button
              type="button"
              onClick={() => setVehicleDetailTab('ai-gallery')}
              className={tabButtonClass(vehicleDetailTab === 'ai-gallery')}
            >
              <ImageIcon className="w-4 h-4" />
              Galería IA
            </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
          {vehicleDetailTab === 'reels' ? (
            <section aria-label="Reels del vehículo">
              <VideoJobList embedded inventoryVehicleId={selectedVehicle.id} />
            </section>
          ) : vehicleDetailTab === 'raw-clips' ? (
            <section aria-label="Clips en bruto">
              <RawClipsLibraryDashboard
                embedded
                hideHeader
                inventoryVehicleId={selectedVehicle.id}
                vehicleTitle={selectedVehicleTitle ?? undefined}
              />
            </section>
          ) : vehicleDetailTab === 'raw-full' ? (
            <section aria-label="Videos en bruto">
              <RawFullVideosLibraryDashboard
                {...rawFullEmbed}
                forceMainTab="library"
                inventoryVehicleId={selectedVehicle.id}
                vehicleTitle={selectedVehicleTitle ?? undefined}
              />
            </section>
          ) : (
            <section aria-label="Galería IA">
              <VehicleAiCreativesGallery
                vehicleId={selectedVehicle.id}
                vehicleTitle={selectedVehicleTitle ?? undefined}
              />
            </section>
          )}
          </div>
        </div>
      ) : activeTab === 'educativo' ? (
        <RawFullVideosLibraryDashboard {...rawFullEmbed} forceMainTab="library" lockedPilarTab="pilar3" />
      ) : activeTab === 'entretenimiento' ? (
        <RawFullVideosLibraryDashboard {...rawFullEmbed} forceMainTab="library" lockedPilarTab="pilar4" />
      ) : activeTab === 'humanizar' ? (
        <RawFullVideosLibraryDashboard {...rawFullEmbed} forceMainTab="library" lockedPilarTab="pilar2" />
      ) : activeTab === 'bandeja' ? (
        <MarketingInboxVideosPanel
          refreshKey={inboxRefreshKey}
          onRequestUpload={() => setInboxUploadOpen(true)}
          onAssigned={() => setLibraryRefreshKey((k) => k + 1)}
        />
      ) : activeTab === 'cola' ? (
        <RawFullVideosLibraryDashboard {...rawFullEmbed} forceMainTab="queue" />
      ) : (
        <>
      {capped ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Se alcanzó el límite de filas cargadas para esta vista. Refina búsqueda o filtros de estado para ver todo el
            inventario.
          </p>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-4 h-4 text-violet-600" />
          Filtros
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Marca, modelo o placa..."
              className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          <div className="lg:col-span-4">
            <select
              value={coverage}
              onChange={(e) =>
                setCoverage(
                  e.target.value as
                    | 'all'
                    | 'with_generated'
                    | 'without_generated'
                    | 'with_published'
                    | 'without_published'
                )
              }
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
            >
              <option value="all">Cobertura: todos</option>
              <option value="with_generated">Con reels generados</option>
              <option value="without_generated">Sin reels generados</option>
              <option value="with_published">Con al menos 1 publicado</option>
              <option value="without_published">Sin publicados</option>
            </select>
          </div>

          <div className="lg:col-span-3 flex items-center gap-2">
            <ArrowDownWideNarrow className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
            <select
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as
                    | 'generated_desc'
                    | 'generated_asc'
                    | 'published_desc'
                    | 'published_asc'
                    | 'pending_desc'
                    | 'failed_desc'
                    | 'brand_asc'
                    | 'updated_desc'
                )
              }
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
            >
              <option value="generated_desc">Más reels generados primero</option>
              <option value="generated_asc">Menos reels generados primero</option>
              <option value="published_desc">Más publicados primero</option>
              <option value="published_asc">Menos publicados primero</option>
              <option value="pending_desc">Más en cola primero</option>
              <option value="failed_desc">Más fallidos primero</option>
              <option value="brand_asc">Marca A → Z</option>
              <option value="updated_desc">Actualización inventario (reciente)</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold text-gray-600 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-5 sm:px-6 py-4 min-w-[220px]">Vehículo</th>
                <th className="px-4 sm:px-5 py-4 whitespace-nowrap">Estado</th>
                <th className="px-4 sm:px-5 py-4 text-center whitespace-nowrap w-[1%]">Generados</th>
                <th className="px-4 sm:px-5 py-4 text-center whitespace-nowrap w-[1%]">Publicados</th>
                <th className="px-4 sm:px-5 py-4 text-center whitespace-nowrap w-[1%]">En cola</th>
                <th className="px-4 sm:px-5 py-4 text-center whitespace-nowrap w-[1%]">Fallidos</th>
                <th className="px-5 sm:px-6 py-4 text-center whitespace-nowrap w-[1%]">Cancelados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 sm:px-6 py-16 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-2" />
                    Cargando inventario…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 sm:px-6 py-12 text-center text-gray-500">
                    No hay vehículos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => handleVehicleSelect(r)}
                    className="hover:bg-violet-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 sm:px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">
                        {toTitleCase(r.brand)} {toTitleCase(r.model)} {r.year}
                      </div>
                      {r.version ? (
                        <div className="text-xs text-gray-500 mt-0.5">{toTitleCase(r.version)}</div>
                      ) : null}
                      {r.plate ? <div className="text-xs text-gray-400 mt-0.5">Placa: {r.plate}</div> : null}
                    </td>
                    <td className="px-4 sm:px-5 py-4 whitespace-nowrap align-middle">
                      <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        {formatStatus(r.status)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-center font-semibold text-violet-700 tabular-nums align-middle">
                      {r.uniqueGenerated}
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-center font-semibold text-emerald-700 tabular-nums align-middle">
                      {r.uniquePublished}
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-center font-medium text-sky-700 tabular-nums align-middle">
                      {r.uniquePending}
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-center font-medium text-red-700 tabular-nums align-middle">
                      {r.uniqueFailed}
                    </td>
                    <td className="px-5 sm:px-6 py-4 text-center font-medium text-gray-600 tabular-nums align-middle">
                      {r.uniqueCancelled}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
            hasNextPage={page < totalPages}
            hasPrevPage={page > 1}
          />
        ) : null}
      </div>
        </>
      )}

      <UploadFullVideosModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialFormato={uploadFormato()}
        initialVehicleId={uploadVehicleId}
        onSaved={() => {
          setLibraryRefreshKey((k) => k + 1)
          if (activeTab === 'vehiculo') setVehicleDetailTab('raw-full')
        }}
        onScheduled={() => {
          setLibraryRefreshKey((k) => k + 1)
          setActiveTab('cola')
        }}
      />
      <UploadInboxVideosModal
        isOpen={inboxUploadOpen}
        onClose={() => setInboxUploadOpen(false)}
        onSaved={() => {
          setInboxRefreshKey((k) => k + 1)
          setActiveTab('bandeja')
        }}
      />
    </div>
  )
}
