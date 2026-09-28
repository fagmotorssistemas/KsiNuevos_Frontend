'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppointmentModal } from './appointment/AppointmentModal'
import {
  toVehiclePixel,
  trackAddToWishlist,
  type VehiclePixelSource,
} from '@/lib/meta/pixel'

interface BookingButtonProps {
  carId: string
  carTitle: string
  car?: VehiclePixelSource
}

export default function BookingButton({ carId, carTitle, car }: BookingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleOpen = () => {
    const vehicle = car ?? { id: carId }
    trackAddToWishlist(toVehiclePixel(vehicle))
    if (!user) {
      const returnUrl = encodeURIComponent(pathname)
      router.push(`/login?redirect=${returnUrl}`)
      return
    }
    setIsModalOpen(true)
  }

  return (
    <>
      <button 
        onClick={handleOpen}
        className="w-full bg-red-600 text-white text-lg font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-red-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        ¡Lo quiero! Agendar Cita
      </button>

      <AppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        carId={carId}
        carTitle={carTitle}
        car={car}
      />
    </>
  )
}
