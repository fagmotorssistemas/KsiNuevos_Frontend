'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NoticieroVehicle } from '@/lib/noticiero/types'

const INVENTORY_SELECT =
  'id, brand, model, year, color, version, price, transmission, fuel_type, engine_displacement, drive_type, passenger_capacity, type_body, horse_power, mileage, img_main_url'

interface VehicleSelectorProps {
  selectedId: string
  onSelect: (vehicle: NoticieroVehicle | null) => void
  disabled?: boolean
}

function formatPrice(price: number | string | null): string {
  if (price == null || price === '') return 'Consultar'
  const n = Number(price)
  if (Number.isNaN(n)) return String(price)
  return `$${n.toLocaleString('es-EC', { maximumFractionDigits: 0 })}`
}

function formatLabel(row: NoticieroVehicle): string {
  return `${row.brand} ${row.model} ${row.year ?? ''} • ${row.color} • ${formatPrice(row.price)}`
}

export function VehicleSelector({ selectedId, onSelect, disabled }: VehicleSelectorProps) {
  const [rows, setRows] = useState<NoticieroVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => formatLabel(r).toLowerCase().includes(q))
  }, [rows, query])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  function handleChange(id: string) {
    const vehicle = rows.find((r) => r.id === id) ?? null
    onSelect(vehicle)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Vehículo disponible</label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled || loading}
          placeholder="Buscar por marca, modelo, color..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-gray-50"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando inventario...</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <select
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || loading || filtered.length === 0}
        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-gray-50"
      >
        <option value="">Selecciona un vehículo</option>
        {filtered.map((row) => (
          <option key={row.id} value={row.id}>
            {formatLabel(row)}
          </option>
        ))}
      </select>

      {selected && (
        <div className="flex items-start gap-3 p-4 bg-violet-50 rounded-xl border border-violet-100">
          <Car className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          <div className="text-sm text-violet-900">
            <p className="font-bold">
              {selected.brand} {selected.model}
            </p>
            <p className="text-violet-700 mt-1">{formatLabel(selected)}</p>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
          No hay vehículos disponibles que coincidan con la búsqueda.
        </p>
      )}
    </div>
  )
}
