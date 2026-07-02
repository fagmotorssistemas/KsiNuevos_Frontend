'use client'

import Image from 'next/image'
import { Car, Plus, Search } from 'lucide-react'
import type { AvailableVehicleRow, CampaignSegment } from '@/types/marketing-campaigns'
import { formatVehiclePrice, vehicleTitle } from '@/types/marketing-campaigns'
import { segmentLabel } from '@/lib/marketing/campaign-segments'

type Props = {
  vehicles: AvailableVehicleRow[]
  segment: CampaignSegment
  totalInventory?: number
  search: string
  onSearchChange: (value: string) => void
  selectedGroupId: string | null
  onAddVehicle: (inventoryId: string) => void
  addingId: string | null
}

export function AvailableVehiclesPanel({
  vehicles,
  segment,
  totalInventory,
  search,
  onSearchChange,
  selectedGroupId,
  onAddVehicle,
  addingId,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gradient-to-br from-violet-600 to-violet-700 px-4 py-4 text-white">
        <h2 className="text-base font-bold">Autos disponibles</h2>
        <p className="text-xs text-violet-100 mt-1">
          Solo {segmentLabel(segment)} · inventoryoracle · clic para agregar al grupo seleccionado
        </p>
      </div>

      <div className="p-3 border-b border-gray-100 bg-slate-50/80">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar marca, modelo, placa..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        {!selectedGroupId && (
          <p className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
            Selecciona un grupo de {segmentLabel(segment)} para agregar vehículos.
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
            <Car className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No hay {segmentLabel(segment)} disponibles</p>
            <p className="text-xs mt-1">
              {totalInventory
                ? 'Prueba otra búsqueda o revisa si ya están en un grupo.'
                : 'No se encontraron vehículos en inventoryoracle.'}
            </p>
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const disabled = !selectedGroupId || addingId === vehicle.id
            return (
              <button
                key={vehicle.id}
                type="button"
                disabled={disabled}
                onClick={() => selectedGroupId && onAddVehicle(vehicle.id)}
                className={`group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
                  disabled
                    ? 'border-gray-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm'
                }`}
              >
                <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {vehicle.img_main_url ? (
                    <Image
                      src={vehicle.img_main_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <Car className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-violet-900">
                    {vehicleTitle(vehicle.brand, vehicle.model, vehicle.year)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-violet-700">
                      {formatVehiclePrice(vehicle.display_price)}
                    </span>
                    {vehicle.type_body && (
                      <span className="text-[10px] text-slate-400 truncate capitalize">
                        {vehicle.type_body}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-lg p-1.5 ${
                    selectedGroupId
                      ? 'bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white'
                      : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5 text-center text-xs text-slate-500 bg-slate-50">
        {vehicles.length} {segmentLabel(segment)} disponible{vehicles.length === 1 ? '' : 's'}
      </div>
    </aside>
  )
}
