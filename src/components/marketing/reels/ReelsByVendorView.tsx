'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, User } from 'lucide-react'
import { ReelFormatoBadge } from './reel-badges'
import { ReelScriptDetail } from './ReelScriptDetail'
import { ReelVehicleSummary } from './ReelVehicleSummary'
import { reelsService } from '@/services/reels.service'
import { REEL_FORMATOS, getReelFormatoLabel, type ReelFormato, type ReelScript } from '@/types/reel'

type VendorOption = { id: string; nombre: string }

export function ReelsByVendorView({
  vendorOptions,
  initialVendorId,
}: {
  vendorOptions: VendorOption[]
  initialVendorId?: string | null
}) {
  const [vendorId, setVendorId] = useState(initialVendorId ?? '')
  const [manualVendorId, setManualVendorId] = useState('')
  const [formato, setFormato] = useState<ReelFormato | 'todos'>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [scripts, setScripts] = useState<ReelScript[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (initialVendorId) setVendorId(initialVendorId)
  }, [initialVendorId])

  const effectiveVendorId = manualVendorId.trim() || vendorId

  const load = useCallback(async () => {
    if (!effectiveVendorId) return
    setLoading(true)
    setError(null)
    try {
      const res = await reelsService.getByVendor(effectiveVendorId, {
        formato: formato === 'todos' ? undefined : formato,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      })
      setScripts(res)
      setSelectedIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los reels')
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [effectiveVendorId, formato, fechaDesde, fechaHasta])

  useEffect(() => {
    if (effectiveVendorId) load()
  }, [load, effectiveVendorId])

  const handleUpdated = (index: number, script: ReelScript) => {
    setScripts((prev) => prev.map((s, i) => (i === index ? script : s)))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase text-gray-500">Vendedor</label>
          <select
            value={vendorOptions.some((v) => v.id === vendorId) ? vendorId : ''}
            onChange={(e) => {
              setVendorId(e.target.value)
              setManualVendorId('')
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white min-w-[180px]"
          >
            <option value="">Selecciona…</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase text-gray-500">o ID de vendedor</label>
          <input
            type="text"
            value={manualVendorId}
            onChange={(e) => setManualVendorId(e.target.value)}
            placeholder="uuid del vendedor"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm min-w-[180px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase text-gray-500">Formato</label>
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as ReelFormato | 'todos')}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
          >
            <option value="todos">Todos</option>
            {REEL_FORMATOS.map((f) => (
              <option key={f} value={f}>
                {getReelFormatoLabel(f)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase text-gray-500">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase text-gray-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={load}
          disabled={!effectiveVendorId || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      {!effectiveVendorId && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          Selecciona un vendedor (de la lista del día cargado, o pega su ID) para ver sus reels.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      {!error && !loading && effectiveVendorId && scripts.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          No hay reels para este vendedor con los filtros seleccionados.
        </div>
      )}

      {!error && scripts.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[520px]">
          <aside className="lg:w-[280px] shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
                {scripts.length} reel(es)
              </p>
            </div>
            <ul className="p-2 space-y-1 overflow-y-auto">
              {scripts.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={[
                      'w-full text-left rounded-xl px-3 py-2.5 border transition-all',
                      i === selectedIndex
                        ? 'border-violet-700 bg-violet-50 shadow-sm ring-1 ring-violet-700/30'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <p className="text-xs font-bold text-violet-800 line-clamp-1 mb-1">
                      {s.titulo || getReelFormatoLabel(s.formato)}
                    </p>
                    <ReelVehicleSummary vehicle={s.vehicle} vehicle2={s.vehicle_2} />
                    <div className="mt-1.5">
                      <ReelFormatoBadge formato={s.formato} variante={s.variante} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-4 sm:p-6">
            {scripts[selectedIndex] && (
              <ReelScriptDetail
                script={scripts[selectedIndex]!}
                onUpdated={(script) => handleUpdated(selectedIndex, script)}
              />
            )}
          </main>
        </div>
      )}
    </div>
  )
}
