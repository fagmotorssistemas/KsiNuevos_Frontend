'use client'

import { useEffect, useMemo, useState } from 'react'
import { Car, Loader2, RefreshCw, Shuffle, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  pilaresService,
  type Pilar1ReplaceCandidate,
} from '@/services/pilares.service'
import { formatReelKilometraje, formatReelPrecio, getReelVehicleLabel } from '@/types/reel'
import type { PilarVehicleData } from '@/types/pilar'

function candidateLabel(c: Pilar1ReplaceCandidate): string {
  return (
    (typeof c.presentacion === 'string' && c.presentacion) ||
    getReelVehicleLabel(c as PilarVehicleData) ||
    c.id
  )
}

export function Pilar1ReplaceVehicleModal({
  isOpen,
  assignmentId,
  currentVehicleLabel,
  onClose,
  onReplaced,
}: {
  isOpen: boolean
  assignmentId: string
  currentVehicleLabel?: string | null
  onClose: () => void
  onReplaced: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [replacing, setReplacing] = useState<'auto' | 'pick' | null>(null)
  const [candidates, setCandidates] = useState<Pilar1ReplaceCandidate[]>([])
  const [currentVehicleId, setCurrentVehicleId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !assignmentId) return
    let cancelled = false
    setLoading(true)
    setQ('')
    setSelectedId(null)
    void (async () => {
      try {
        const res = await pilaresService.getPilar1ReplaceCandidates(assignmentId)
        if (cancelled) return
        setCandidates(res.candidates)
        setCurrentVehicleId(res.current_vehicle_id ?? null)
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'No se pudieron cargar candidatos')
          setCandidates([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, assignmentId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return candidates
    return candidates.filter((c) => candidateLabel(c).toLowerCase().includes(term))
  }, [candidates, q])

  async function replace(vehicleId?: string) {
    setReplacing(vehicleId ? 'pick' : 'auto')
    try {
      const res = await pilaresService.replacePilar1Vehicle(assignmentId, {
        vehicleId,
        regenerar: true,
      })
      toast.success(
        res.new_vehicle_id
          ? 'Vehículo reemplazado y guión regenerado'
          : 'Vehículo reemplazado'
      )
      onReplaced()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reemplazar el vehículo')
    } finally {
      setReplacing(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Reemplazar vehículo</h2>
            <p className="text-xs text-gray-500 mt-1">
              Pilar 1 · Marketing
              {currentVehicleLabel ? (
                <>
                  {' '}
                  · Actual: <span className="font-semibold text-gray-700">{currentVehicleLabel}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!replacing}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <button
            type="button"
            disabled={!!replacing || loading}
            onClick={() => void replace()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {replacing === 'auto' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4" />
            )}
            Elegir automáticamente el siguiente
          </button>

          <div className="relative">
            <div className="h-px bg-gray-100" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              o elige uno
            </span>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar marca, modelo…"
            disabled={loading || !!replacing}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No hay candidatos disponibles ahora.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[42vh] overflow-y-auto">
              {filtered.map((c) => {
                const id = c.id || c.inventory_vehicle_id || ''
                const active = selectedId === id
                const isCurrent = currentVehicleId === id
                const precio = formatReelPrecio(c as PilarVehicleData)
                const km = formatReelKilometraje(c as PilarVehicleData)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={!!replacing || isCurrent}
                      onClick={() => setSelectedId(id)}
                      className={[
                        'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
                        active
                          ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-100'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                        isCurrent ? 'opacity-50 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate capitalize">
                            {candidateLabel(c)}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {[precio, km, c.color].filter(Boolean).join(' · ') || 'Sin detalles'}
                            {isCurrent ? ' · actual' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            disabled={!!replacing}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!!replacing || !selectedId}
            onClick={() => selectedId && void replace(selectedId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {replacing === 'pick' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Usar seleccionado
          </button>
        </div>
      </div>
    </div>
  )
}
