import { useState, useEffect, useMemo } from 'react'

// --- Helpers Auxiliares ---
const generateMinuteRange = (start: number, end: number) => {
  const mins = []
  for (let i = start; i <= end; i += 5) {
    mins.push(i < 10 ? `0${i}` : `${i}`)
  }
  return mins
}

const getNextDays = () => {
  const days = []
  const today = new Date()
  
  for (let i = 0; i < 21; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    const dayOfWeek = date.getDay() // 0 = Domingo
    if (dayOfWeek === 0) continue; // Excluir domingos

    const label = new Intl.DateTimeFormat('es-ES', { 
      weekday: 'short', day: 'numeric', month: 'short' 
    }).format(date)
    
    // "Lun 12 Ene"
    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1)
    const value = date.toISOString().split('T')[0]

    days.push({ 
      label: formattedLabel, 
      value, 
      dayOfWeek,
      isToday: i === 0 
    })
  }
  return days
}

export function useAppointmentSlots() {
  const [days, setDays] = useState<ReturnType<typeof getNextDays>>([])
  
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')

  // Cargar días al montar
  useEffect(() => {
    const availableDays = getNextDays()
    setDays(availableDays)
    if (availableDays.length > 0) setSelectedDate(availableDays[0].value)
  }, [])

  // --- Lógica de Horas ---
  const availableHours = useMemo(() => {
    const currentDayObj = days.find(d => d.value === selectedDate)
    if (!currentDayObj) return []

    // Sábado (6): 9:00 - 13:00
    if (currentDayObj.dayOfWeek === 6) {
      return ['09', '10', '11', '12', '13']
    }
    // Lunes - Viernes: 8:00 - 18:00
    return ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']
  }, [selectedDate, days])

  // Limpiar hora si cambia el día y ya no es válida
  useEffect(() => {
    if (selectedHour && !availableHours.includes(selectedHour)) {
      setSelectedHour('')
      setSelectedMinute('')
    }
  }, [availableHours, selectedHour])

  // --- Lógica de Minutos ---
  const availableMinutes = useMemo(() => {
    if (!selectedHour) return []
    const currentDayObj = days.find(d => d.value === selectedDate)
    const hourInt = parseInt(selectedHour, 10)
    
    // Caso Sábado
    if (currentDayObj?.dayOfWeek === 6) {
      if (hourInt === 9) return generateMinuteRange(30, 55)
      if (hourInt === 13) return generateMinuteRange(0, 30)
      return generateMinuteRange(0, 55)
    }

    // Caso Lun-Vie
    if (hourInt === 8) return generateMinuteRange(30, 55)
    if (hourInt === 18) return generateMinuteRange(0, 30)
    return generateMinuteRange(0, 55)

  }, [selectedDate, selectedHour, days])

  // Limpiar minutos si ya no son válidos
  useEffect(() => {
    if (selectedMinute && availableMinutes.length > 0 && !availableMinutes.includes(selectedMinute)) {
      setSelectedMinute('')
    }
  }, [availableMinutes, selectedMinute])

  // Reset total
  const resetSelection = () => {
      setSelectedHour('')
      setSelectedMinute('')
  }

  return {
    days,
    availableHours,
    availableMinutes,
    selectedDate, setSelectedDate,
    selectedHour, setSelectedHour,
    selectedMinute, setSelectedMinute,
    resetSelection
  }
}