'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Car, Loader2, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NoticieroVehicle } from '@/lib/noticiero/types'

const INVENTORY_SELECT =
  'id, brand, model, year, color, version, price, transmission, fuel_type, engine_displacement, drive_type, passenger_capacity, type_body, horse_power, mileage, img_main_url'

interface VehicleSelectorProps {
  selectedId: string
  onSelect: (vehicle: NoticieroVehicle | null) => void
  disabled?: boolean
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatPrice(price: number | string | null): string {
  if (price == null || price === '') return ''
  const n = Number(price)
  if (Number.isNaN(n)) return String(price)
  return `$${n.toLocaleString('es-EC', { maximumFractionDigits: 0 })}`
}

function vehicleSearchLabel(row: NoticieroVehicle): string {
  const year = row.year != null ? String(row.year) : ''
  return `${toTitleCase(row.brand)} ${toTitleCase(row.model)}${year ? ` (${year})` : ''}`
}

export function VehicleSelector({ selectedId, onSelect, disabled }: VehicleSelectorProps) {
  const [rows, setRows] = useState<NoticieroVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    setLoading(true)
    setError(null)

    supabase
      .from('inventoryoracle')
      .select(INVENTORY_SELECT)
      .eq('status', 'disponible')
      .order('updated_at', { ascending: false })
      .limit(400)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setRows([])
        } else {
          setRows((data ?? []) as NoticieroVehicle[])
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSearchTerm('')
      return
    }
    const selected = rows.find((r) => r.id === selectedId)
    if (selected) {
      setSearchTerm(vehicleSearchLabel(selected))
    }
  }, [selectedId, rows])

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => {
      const haystack = `${r.brand} ${r.model} ${r.year ?? ''} ${r.version ?? ''} ${r.color ?? ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [rows, searchTerm])

  function handleSelectVehicle(vehicle: NoticieroVehicle) {
    onSelect(vehicle)
    setSearchTerm(vehicleSearchLabel(vehicle))
    setIsDropdownOpen(false)
  }

  function clearVehicleSelection() {
    onSelect(null)
    setSearchTerm('')
    setIsDropdownOpen(true)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-violet-600" />
        <label className="text-sm font-bold text-gray-900">Vehículo disponible</label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <div ref={dropdownRef} className="relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsDropdownOpen(true)
              if (e.target.value === '') onSelect(null)
            }}
            onFocus={() => !disabled && setIsDropdownOpen(true)}
            disabled={disabled || loading}
            placeholder="Buscar por marca, modelo, año o versión..."
            className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {searchTerm ? (
              <button
                type="button"
                onClick={clearVehicleSelection}
                disabled={disabled}
                className="hover:text-gray-600 disabled:opacity-40"
                aria-label="Limpiar selección"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => !disabled && setIsDropdownOpen((v) => !v)}
                disabled={disabled}
                className="hover:text-gray-600 disabled:opacity-40"
                aria-label="Abrir listado de vehículos"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDropdownOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-20">
            {loading ? (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">Cargando inventario...</p>
            ) : filteredVehicles.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">No se encontraron vehículos</p>
            ) : (
              <ul className="py-1">
                {filteredVehicles.slice(0, 120).map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectVehicle(v)}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        v.id === selectedId ? 'bg-violet-50' : ''
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {toTitleCase(v.brand)} {toTitleCase(v.model)} {v.year}
                      </p>
                      {(() => {
                        const details = [
                          v.color ? toTitleCase(v.color) : null,
                          v.version ? toTitleCase(v.version) : null,
                          formatPrice(v.price) || null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                        return details ? <p className="text-xs text-gray-500">{details}</p> : null
                      })()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">Solo vehículos con estado disponible en inventario.</p>
    </div>
  )
}