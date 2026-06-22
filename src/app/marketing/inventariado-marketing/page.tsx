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
} from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import {
  InventoryKpiStats,
  type InventoryKpiFilter,
  type InventoryKpiSummary,
} from '@/components/features/inventory/InventoryKpiStats'
import { RawClipsLibraryDashboard } from '@/components/videos/RawClipsLibraryDashboard'
import { VideoJobList } from '@/components/videos/VideoJobList'

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

type PageTab = 'inventario' | 'clips'
type VehicleDetailTab = 'reels' | 'raw-clips'

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
  }, [page, debouncedQ, inventoryStatus, coverage, sort, fetchPage])

  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(page * PAGE_SIZE, total)

  const activeKpiFilter: InventoryKpiFilter =
    inventoryStatus === 'disponible' ? 'active' : inventoryStatus === 'vendido' ? 'baja' : 'all'

  function handleKpiFilterChange(filter: InventoryKpiFilter) {
    if (filter === 'active') setInventoryStatus('disponible')
    else if (filter === 'baja') setInventoryStatus('vendido')
    else setInventoryStatus('all')
  }

  function handleVehicleSelect(row: Row) {
    setSelectedVehicle(row)
    setVehicleDetailTab('reels')
    setActiveTab('clips')
  }

  function handleBackToInventory() {
    setActiveTab('inventario')
  }

  const selectedVehicleTitle = selectedVehicle ? formatVehicleTitle(selectedVehicle) : null

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
              Inventario con reels generados vinculados al vehículo y estado de publicación en redes. Haz clic en un
              vehículo para ver sus reels y clips en bruto.
            </p>
          </div>
        </div>
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
        {selectedVehicle ? (
          <button
            type="button"
            onClick={() => setActiveTab('clips')}
            className={`${tabButtonClass(activeTab === 'clips')} max-w-full`}
          >
            <Film className="w-4 h-4 shrink-0" />
            <span className="truncate">{selectedVehicleTitle}</span>
          </button>
        ) : null}
      </div>

      {activeTab === 'clips' && selectedVehicle ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">{selectedVehicleTitle}</h2>
              {selectedVehicle.plate ? (
                <p className="text-xs text-gray-400 mt-0.5">Placa: {selectedVehicle.plate}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleBackToInventory}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shrink-0 self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inventario
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
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
          </div>

          {vehicleDetailTab === 'reels' ? (
            <section aria-label="Reels del vehículo">
              <VideoJobList embedded inventoryVehicleId={selectedVehicle.id} />
            </section>
          ) : (
            <section aria-label="Clips en bruto">
              <RawClipsLibraryDashboard
                embedded
                hideHeader
                inventoryVehicleId={selectedVehicle.id}
                vehicleTitle={selectedVehicleTitle ?? undefined}
              />
            </section>
          )}
        </div>
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

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <InventoryKpiStats
          data={kpiSummary}
          loading={kpiLoading && !kpiSummary}
          activeFilter={activeKpiFilter}
          onFilterChange={handleKpiFilterChange}
        />
      </div>

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
    </div>
  )
}
