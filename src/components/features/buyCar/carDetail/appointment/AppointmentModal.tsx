'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBuyingAppointment } from '@/hooks/Homeksi/appointment-actions'
import { KsButton } from '@/components/ui/Homeksi/KsButton'
import { useAppointmentSlots } from '@/hooks/Homeksi/useAppointmentSlots'
import { TimePicker } from './TimePicker'

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  carId: string
  carTitle: string
}

export const AppointmentModal = ({ isOpen, onClose, carId, carTitle }: AppointmentModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  // Usamos nuestro Hook personalizado de lógica
  const slots = useAppointmentSlots()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const { selectedDate, selectedHour, selectedMinute } = slots

    if (!selectedDate || !selectedHour || !selectedMinute) {
      alert("Por favor completa el horario.")
      return
    }

    setIsLoading(true)

    // Construir fecha ISO
    const finalDateTime = `${selectedDate}T${selectedHour}:${selectedMinute}`
    
    const formData = new FormData(e.currentTarget)
    formData.set('date', finalDateTime)
    formData.append('inventoryId', carId)

    const result = await createBuyingAppointment(formData)

    setIsLoading(false)

    if (result?.error) {
      alert(result.error)
    } else {
      slots.resetSelection()
      onClose()
      alert("¡Cita agendada con éxito!")
      router.push('/perfil')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center z-30 relative shadow-sm">
          <div>
            <h3 className="font-bold text-xl text-gray-900">Agendar Cita</h3>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden relative">
          
          {/* Componente del Grid de Tiempo */}
          <TimePicker {...slots} />

          {/* Footer del Formulario */}
          <div className="p-6 bg-white space-y-4 z-30 relative shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
            <textarea 
              name="notes"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400"
              placeholder="Comentario adicional (opcional)..."
            />

            <KsButton 
              type="submit" 
              variant="primary" 
              fullWidth 
              className="rounded-xl shadow-lg h-14 text-base font-bold tracking-wide"
              isLoading={isLoading}
              disabled={isLoading || !slots.selectedHour || !slots.selectedMinute}
            >
              {slots.selectedHour && slots.selectedMinute 
                ? `Confirmar Cita: ${slots.selectedHour}:${slots.selectedMinute}`
                : 'Selecciona un horario'}
            </KsButton>
          </div>
        </form>
      </div>

      {/* Estilos Globales para Scrollbar (se mantienen aquí o en tu CSS global) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  )
}