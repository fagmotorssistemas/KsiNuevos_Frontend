'use client'

import React, { useEffect } from 'react'
import type { SellRequestData } from '@/hooks/Homeksi/sell-actions'
import { useAppointmentSlots } from '@/hooks/Homeksi/useAppointmentSlots' 
import { TimePicker } from '@/components/features/buyCar/carDetail/appointment/TimePicker'

interface StepProps {
  data: Partial<SellRequestData>
  update: (data: Partial<SellRequestData>) => void
}

export const Step4Inspection = ({ data, update }: StepProps) => {
  const slots = useAppointmentSlots()

useEffect(() => {
  let newDate: string | undefined = undefined

  if (slots.selectedDate && slots.selectedHour && slots.selectedMinute) {
      // 1. Creamos un objeto Date local con los valores seleccionados
      // Esto asegura que el navegador entienda la hora en tu zona horaria
      const localDate = new Date(`${slots.selectedDate}T${slots.selectedHour}:${slots.selectedMinute}:00`);
      
      // 2. Convertimos a ISOString (UTC) antes de guardar, igual que en el flujo de compra
      newDate = localDate.toISOString();
  }

  if (data.appointmentDate !== newDate) {
      update({ appointmentDate: newDate })
  }
  
}, [slots.selectedDate, slots.selectedHour, slots.selectedMinute, data.appointmentDate, update])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 text-center border-b border-gray-100 flex-shrink-0">
        <h4 className="text-xl font-bold text-gray-900">Agenda tu Inspección</h4>
        <p className="text-sm text-gray-500 mt-1">
          Elige cuándo traer tu auto a nuestra agencia. <br/>
          <span className="text-xs font-medium text-red-600">(Duración aprox: 30 min)</span>
        </p>
      </div>

      <div className="flex-grow bg-gray-50 relative">
          <TimePicker {...slots} />
      </div>

      <div className="px-6 py-4 bg-white text-center border-t border-gray-100 flex-shrink-0">
         <p className={`text-sm font-medium ${slots.selectedDate ? 'text-black' : 'text-gray-400'}`}>
            {slots.selectedDate && slots.selectedHour && slots.selectedMinute 
                ? `Cita seleccionada: ${slots.selectedDate} a las ${slots.selectedHour}:${slots.selectedMinute}`
                : "Selecciona día y hora para finalizar"}
         </p>
      </div>
    </div>
  )
}