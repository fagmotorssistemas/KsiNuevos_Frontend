'use client'

import React, { useState, useEffect } from 'react' // Se agrega useEffect
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
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const router = useRouter()
  const slots = useAppointmentSlots()

  // BLOQUEO DE SCROLL: Evita que la galería o la página se muevan al fondo
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    
    const { selectedDate, selectedHour, selectedMinute } = slots

    if (!selectedDate || !selectedHour || !selectedMinute) {
      setErrorMessage("Por favor selecciona un horario.")
      return
    }

    setIsLoading(true)

    const finalDateTime = `${selectedDate}T${selectedHour}:${selectedMinute}`
    const formData = new FormData(e.currentTarget)
    formData.set('date', finalDateTime)
    formData.append('inventoryId', carId)

    try {
      const result = await createBuyingAppointment(formData)
      
      if (result?.error) {
        setErrorMessage(result.error)
      } else {
        slots.resetSelection()
        setIsSuccess(true)
      }
    } catch (error) {
      setErrorMessage("Ocurrió un error inesperado. Inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToAppointments = () => {
    onClose()
    router.push('/perfil')
  }

  if (!isOpen) return null

  return (
    /* CAMBIO CLAVE: z-[100] y backdrop-blur para asegurar que nada de la galería 
       se superponga visualmente al modal.
    */
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      
      {/* Overlay que permite cerrar al hacer click fuera */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div className="relative z-[110] bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        
        {!isSuccess ? (
          <>
            <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center z-30 relative shadow-sm">
              <h3 className="font-bold text-xl text-gray-900">Agendar Cita</h3>
              <button 
                onClick={onClose} 
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden relative">
              <TimePicker {...slots} />

              <div className="p-6 bg-white space-y-4 z-30 relative shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg animate-in fade-in zoom-in-95">
                    {errorMessage}
                  </div>
                )}

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
          </>
        ) : (
          <div className="p-8 sm:p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Cita agendada!</h3>
            <p className="text-gray-600 mb-8">
              Tu solicitud para el <span className="font-semibold text-gray-900">{carTitle}</span> se ha procesado con éxito.
            </p>

            <div className="flex flex-col w-full gap-3">
              <KsButton 
                onClick={handleGoToAppointments}
                variant="primary" 
                fullWidth 
                className="rounded-xl h-12 text-sm font-bold"
              >
                Ir a mis citas
              </KsButton>
              
              <button 
                onClick={onClose}
                className="text-gray-500 text-sm font-medium hover:text-gray-800 transition-colors py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  )
}