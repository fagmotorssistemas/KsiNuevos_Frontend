'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { PilarSistemaBadge } from './pilar-badges'
import { PilarScriptDetail } from './PilarScriptDetail'
import { ReelVehicleSummary } from '@/components/marketing/reels/ReelVehicleSummary'
import { pilaresService } from '@/services/pilares.service'
import {
  getPilarLabel,
  PILAR_SISTEMAS,
  type PilarScript,
  type PilarSistema,
} from '@/types/pilar'

type VendorOption = { id: string; nombre: string }

export function PilaresByVendorView({
  vendorOptions,
  initialVendorId,
}: {
  vendorOptions: VendorOption[]
  initialVendorId?: string | null
}) {
  const [vendorId, setVendorId] = useState(initialVendorId ?? '')
  const [manualVendorId, setManualVendorId] = useState('')
  const [sistema, setSistema] = useState<PilarSistema | 'todos'>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [scripts, setScripts] = useState<PilarScript[]>([])
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
      const res = await pilaresService.getByVendor(effectiveVendorId, {
        sistema: sistema === 'todos' ? undefined : sistema,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      })
      setScripts(res)
      setSelectedIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los guiones')
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [effectiveVendorId, sistema, fechaDesde, fechaHasta])

  useEffect(() => {
    if (effectiveVendorId) void load()
  }, [load, effectiveVendorId])

  const selected = scripts[selectedIndex] ?? null

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
          <label className="text-[11px] font-bold uppercase text-gray-500">Pilar</label>
          <select
            value={sistema}
            onChange={(e) => setSistema(e.target.value as PilarSistema | 'todos')}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
          >
            <option value="todos">Todos</option>
            {PILAR_SISTEMAS.map((s) => (
              <option key={s} value={s}>
                {getPilarLabel(s)}
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
          onClick={() => void load()}
          disabled={!effectiveVendorId || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      ) : null}

      {!effectiveVendorId ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          Elige un vendedor para ver sus guiones de pilares.
        </div>
      ) : loading && scripts.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          Sin guiones para este vendedor.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 min-h-[480px]">
          <aside className="lg:w-[320px] shrink-0 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-500">
              {scripts.length} guion(es)
            </div>
            <ul className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {scripts.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={[
                      'w-full text-left rounded-xl px-3 py-2.5 border transition-colors',
                      i === selectedIndex
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-transparent hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <p className="text-sm font-bold text-gray-900 line-clamp-2">
                      {s.titulo || s.hook_texto || getPilarLabel(s.sistema)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <PilarSistemaBadge sistema={s.sistema} hookCategoria={s.hook_categoria} />
                    </div>
                    {s.vehicle ? (
                      <div className="mt-1.5">
                        <ReelVehicleSummary vehicle={s.vehicle} />
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white p-5">
            {selected ? (
              <PilarScriptDetail script={selected} />
            ) : null}
          </main>
        </div>
      )}
    </div>
  )
}
