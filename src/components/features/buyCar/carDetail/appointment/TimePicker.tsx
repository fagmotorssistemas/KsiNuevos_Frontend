'use client'

import React from 'react'
import { SelectorColumn } from './SelectorColumn'

// Props que vienen del Hook
interface TimePickerProps {
  days: { label: string, value: string, isToday: boolean }[]
  availableHours: string[]
  availableMinutes: string[]
  selectedDate: string
  selectedHour: string
  selectedMinute: string
  setSelectedDate: (v: string) => void
  setSelectedHour: (v: string) => void
  setSelectedMinute: (v: string) => void
}

export const TimePicker = (props: TimePickerProps) => {
  
  // Transformar datos simples a objetos {label, value} para el componente genérico
  const dayOptions = props.days.map(d => ({ 
    label: d.isToday ? 'Hoy' : d.label, 
    value: d.value 
  }))

  const hourOptions = props.availableHours.map(h => ({ label: h, value: h }))
  const minuteOptions = props.availableMinutes.map(m => ({ label: m, value: m }))

  return (
    <div className="flex-grow grid grid-cols-[1.5fr_1fr_1fr] h-64 border-b border-gray-100 relative bg-gray-50/50">
      
      {/* Efectos de degradado (Cilindro 3D) */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-20"></div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-20"></div>

      {/* Columna 1: Días */}
      <SelectorColumn 
        title="Día" 
        options={dayOptions} 
        selectedValue={props.selectedDate} 
        onSelect={props.setSelectedDate} 
      />

      {/* Columna 2: Horas */}
      <SelectorColumn 
        title="Hora" 
        options={hourOptions} 
        selectedValue={props.selectedHour} 
        onSelect={props.setSelectedHour} 
      />

      {/* Columna 3: Minutos */}
      <SelectorColumn 
        title="Min" 
        options={minuteOptions} 
        selectedValue={props.selectedMinute} 
        onSelect={props.setSelectedMinute}
        emptyMessage={
           <span className="text-xs text-gray-300 italic px-2 leading-tight">
             Elige<br/>Hora
           </span>
        }
      />
    </div>
  )
}