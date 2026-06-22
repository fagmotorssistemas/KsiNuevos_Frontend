'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Car, ChevronDown, Loader2, Search, X } from 'lucide-react'

export type InventoryPickerRow = {
  id: string
  brand: string | null
  model: string | null
  year: number | null
  plate: string | null
  version?: string | null
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function vehiclePrimaryLabel(row: InventoryPickerRow): string {
  const brand = row.brand?.trim() ? toTitleCase(row.brand.trim()) : ''
  const model = row.model?.trim() ? toTitleCase(row.model.trim()) : ''
  const year = row.year != null ? String(row.year) : ''
  return [brand, model, year].filter(Boolean).join(' ') || 'Sin nombre'
}

export function vehicleSearchLabel(row: InventoryPickerRow): string {
  const plate = row.plate?.trim().toUpperCase()
  const main = vehiclePrimaryLabel(row)
  return plate ? `${main} · ${plate}` : main
}

export function VehicleInventoryPicker({
  rows,
  loading,
  disabled,
  vehicleId,
  onSelect,
  compact = false,
  showCount = true,
  className,
}: {
  rows: InventoryPickerRow[]
  loading: boolean
  disabled?: boolean
  vehicleId: string
  onSelect: (id: string) => void
  compact?: boolean
  showCount?: boolean
  className?: string
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selected = useMemo(() => rows.find((r) => r.id === vehicleId) ?? null, [rows, vehicleId])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((v) => {
      const haystack = [v.brand, v.model, v.year, v.plate, v.version, v.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [rows, searchTerm])

  useEffect(() => {
    if (!isOpen) return
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (selected && !isOpen) {
      setSearchTerm(vehicleSearchLabel(selected))
    } else if (!selected && !isOpen && !vehicleId) {
      setSearchTerm('')
    }
  }, [selected, isOpen, vehicleId])

  function pick(row: InventoryPickerRow) {
    onSelect(row.id)
    setSearchTerm(vehicleSearchLabel(row))
    setIsOpen(false)
  }

  function clear() {
    onSelect('')
    setSearchTerm('')
    setIsOpen(true)
  }

  const inputClass = compact
    ? 'h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60'
    : 'h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60'

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 ${compact ? 'h-10' : 'h-11'} ${className ?? ''}`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        Cargando inventario…
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className={`relative ${className ?? ''}`}>
      {showCount ? (
        <div className="mb-2 flex items-center gap-2">
          <Car className="h-4 w-4 shrink-0 text-violet-600" />
          <span className="text-xs text-gray-500">{rows.length} vehículos en inventario</span>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            if (e.target.value.trim() === '') onSelect('')
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar marca, modelo, año o placa…"
          className={inputClass}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {searchTerm ? (
            <button
              type="button"
              disabled={disabled}
              onClick={clear}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen((v) => !v)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Abrir listado"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {selected ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <Car className="h-4 w-4 text-violet-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-violet-950">{vehiclePrimaryLabel(selected)}</p>
            {selected.plate ? (
              <p className="text-xs font-medium text-violet-700/80">{selected.plate.toUpperCase()}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No se encontraron vehículos</p>
          ) : (
            <ul>
              {filtered.slice(0, 80).map((row) => {
                const isSelected = row.id === vehicleId
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(row)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug text-gray-900">
                            {vehiclePrimaryLabel(row)}
                          </p>
                          {row.plate ? (
                            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-gray-700">
                              {row.plate}
                            </span>
                          ) : null}
                        </div>
                        {row.version?.trim() ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                            {toTitleCase(row.version.trim())}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
