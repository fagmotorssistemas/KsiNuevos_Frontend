'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Car, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export type PlannerInventoryVehicle = {
  id: string
  brand: string
  model: string
  year: number
  version: string | null
  price: number | null
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatVehicleLabel(v: Pick<PlannerInventoryVehicle, 'brand' | 'model' | 'year'>) {
  return `${toTitleCase(v.brand)} ${toTitleCase(v.model)} (${v.year})`
}

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function PlannerVehicleMultiSelect({ selectedIds, onChange, disabled }: Props) {
  const [vehicles, setVehicles] = useState<PlannerInventoryVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inventoryoracle')
        .select('id, brand, model, year, version, price')
        .order('updated_at', { ascending: false })
        .limit(400)
      if (error) throw error
      setVehicles((data ?? []) as PlannerInventoryVehicle[])
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVehicles()
  }, [loadVehicles])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedVehicles = useMemo(
    () => vehicles.filter((v) => selectedIds.includes(v.id)),
    [vehicles, selectedIds],
  )

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return vehicles
    return vehicles.filter((v) => {
      const haystack = `${v.brand} ${v.model} ${v.year} ${v.version ?? ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [vehicles, searchTerm])

  function toggleVehicle(v: PlannerInventoryVehicle) {
    if (selectedIds.includes(v.id)) {
      onChange(selectedIds.filter((id) => id !== v.id))
    } else {
      onChange([...selectedIds, v.id])
    }
  }

  function removeVehicle(id: string) {
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-violet-600" />
          <label className="text-sm font-bold text-gray-900">Vehículos del inventario</label>
        </div>
        {selectedIds.length > 0 && (
          <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {selectedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVehicles.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white border border-violet-200 text-xs font-semibold text-slate-800 shadow-sm"
            >
              {formatVehicleLabel(v)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeVehicle(v.id)}
                  className="p-0.5 rounded-full hover:bg-violet-100 text-slate-400 hover:text-red-600"
                  aria-label="Quitar vehículo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div ref={dropdownRef} className="relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            disabled={disabled}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsDropdownOpen(true)
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Buscar por marca, modelo, año o versión…"
            className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDropdownOpen((v) => !v)}
                className="hover:text-gray-600"
                aria-label="Abrir listado"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDropdownOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-30">
            {filteredVehicles.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">No se encontraron vehículos</p>
            ) : (
              <ul className="py-1">
                {filteredVehicles.slice(0, 120).map((v) => {
                  const selected = selectedIds.includes(v.id)
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => toggleVehicle(v)}
                        className={[
                          'w-full px-4 py-2.5 text-left transition-colors flex items-start gap-3',
                          selected ? 'bg-violet-50' : 'hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0',
                            selected ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-300 bg-white',
                          ].join(' ')}
                        >
                          {selected && (
                            <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {toTitleCase(v.brand)} {toTitleCase(v.model)} {v.year}
                          </p>
                          {(() => {
                            const details = [
                              v.version ? toTitleCase(v.version) : null,
                              v.price ? `$${v.price.toLocaleString()}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                            return details ? <p className="text-xs text-gray-500">{details}</p> : null
                          })()}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Selecciona todos los vehículos que apliquen. Puedes buscar y marcar varios sin cerrar el listado.
      </p>
    </div>
  )
}
