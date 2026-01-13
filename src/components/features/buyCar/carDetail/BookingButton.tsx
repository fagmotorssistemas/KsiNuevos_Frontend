'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppointmentModal } from './appointment/AppointmentModal'

interface BookingButtonProps {
  carId: string
  carTitle: string
}

export default function BookingButton({ carId, carTitle }: BookingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleOpen = () => {
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

      {/* El Modal vive aquí pero solo se muestra si isModalOpen es true */}
      <AppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        carId={carId}
        carTitle={carTitle}
      />
    </>
  )
}