'use client'

import { Car } from 'lucide-react'
import {
  formatReelKilometraje,
  formatReelPrecio,
  getReelVehicleLabel,
  type ReelVehicleData,
} from '@/types/reel'

/**
 * Resumen visual de un vehículo de reel (imagen + marca/modelo/año + precio/km).
 * Se usa tanto en la lista de asignaciones (aunque el guion aún esté
 * `pendiente_generacion`, ya que `vehicle_data` viene poblado desde el
 * assignment) como en el detalle del guion ya generado.
 */
export function ReelVehicleSummary({
  vehicle,
  vehicle2,
  size = 'sm',
  fallbackLabel,
}: {
  vehicle: ReelVehicleData | null | undefined
  vehicle2?: ReelVehicleData | null
  size?: 'sm' | 'lg'
  fallbackLabel?: string
}) {
  const label = getReelVehicleLabel(vehicle) || fallbackLabel?.trim() || 'Vehículo por confirmar'
  const label2 = vehicle2 ? getReelVehicleLabel(vehicle2) : null
  const precio = formatReelPrecio(vehicle)
  const km = formatReelKilometraje(vehicle)
  const meta = [precio, km].filter(Boolean).join(' · ')
  const img = typeof vehicle?.img_main_url === 'string' ? vehicle.img_main_url : null

  if (size === 'lg') {
    return (
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-16 w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={label} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Car className="h-6 w-6 text-gray-300" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold text-gray-900 leading-snug">
            {label}
            {label2 && (
              <>
                {' '}
                <span className="text-gray-400 font-semibold">vs</span> {label2}
              </>
            )}
          </p>
          {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-extrabold text-gray-900 line-clamp-2">
        {label}
        {label2 && (
          <span className="text-gray-500 font-semibold">
            {' '}
            <span className="text-gray-400">vs</span> {label2}
          </span>
        )}
      </p>
      {meta && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{meta}</p>}
    </div>
  )
}
