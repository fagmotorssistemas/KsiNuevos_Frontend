'use client'

import { useEffect, useRef } from 'react'
import { toVehiclePixel, trackViewContent } from '@/lib/meta/pixel'

type VehicleViewTrackerProps = {
  car: {
    id: string
    brand?: string | null
    model?: string | null
    year?: number | null
    price?: number | null
    color?: string | null
    transmission?: string | null
    type_body?: string | null
    fuel_type?: string | null
  } | null
}

export function VehicleViewTracker({ car }: VehicleViewTrackerProps) {
  const sentFor = useRef<string | null>(null)

  useEffect(() => {
    if (!car) return
    const id = car.id.trim()
    if (!id || sentFor.current === id) return
    sentFor.current = id
    trackViewContent(toVehiclePixel(car))
  }, [car])

  return null
}
