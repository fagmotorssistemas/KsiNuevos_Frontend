import { useState, useEffect } from 'react'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const useTimeSelector = (initialDateISO?: string) => {
  // --- CONSTANTES ---
  // Intervalos de 5 minutos
  const ALL_MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); 
  // ['00', '05', '10', '15', ... '55']

  // --- ESTADOS ---
  const [days, setDays] = useState<{ label: string, value: string, isToday: boolean }[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [availableMinutes, setAvailableMinutes] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');

  // 1. GENERAR DÍAS (Filtrando Domingos)
  useEffect(() => {
    const list = [];
    let count = 0;
    let i = 0;
    
    // Buscamos los próximos 14 días hábiles (o con atención)
    while (count < 14) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado

      // Excluimos Domingos (0)
      if (dayOfWeek !== 0) {
        const value = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric' });
        
        list.push({
          label: capitalize(dayName),
          value: value,
          isToday: i === 0
        });
        count++;
      }
      i++;
    }
    setDays(list);

    // Inicialización si NO hay fecha previa (Modo Crear)
    if (!initialDateISO && list.length > 0) {
      setSelectedDate(list[0].value);
    }
  }, [initialDateISO]); // Solo al montar

  // 2. CALCULAR HORAS DISPONIBLES (Según el día)
  useEffect(() => {
    if (!selectedDate) return;

    // Obtener día de la semana de la fecha seleccionada
    // Agregamos 'T00:00:00' para evitar problemas de zona horaria al parsear
    const d = new Date(`${selectedDate}T00:00:00`); 
    const dayOfWeek = d.getDay();

    let hours: string[] = [];

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Lunes a Viernes: 8:30 - 18:30 -> Las horas "base" son 08 a 18
      hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
    } else if (dayOfWeek === 6) {
      // Sábado: 9:30 - 13:30 -> Las horas "base" son 09 a 13
      hours = ['09', '10', '11', '12', '13'];
    }

    setAvailableHours(hours);

    // Si la hora seleccionada ya no es válida para el nuevo día, resetearla
    if (!hours.includes(selectedHour)) {
      setSelectedHour(''); // Forzar al usuario a elegir de nuevo o seleccionar la primera
      setSelectedMinute('');
    }
  }, [selectedDate, selectedHour]);

  // 3. CALCULAR MINUTOS DISPONIBLES (Según Hora y Día)
  useEffect(() => {
    if (!selectedDate || !selectedHour) {
      setAvailableMinutes([]);
      return;
    }

    const d = new Date(`${selectedDate}T00:00:00`);
    const dayOfWeek = d.getDay();
    let validMinutes = [...ALL_MINUTES];

    // LÓGICA LUNES A VIERNES (8:30 - 18:30)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (selectedHour === '08') {
        // Solo desde 8:30 en adelante
        validMinutes = validMinutes.filter(m => parseInt(m) >= 30);
      } else if (selectedHour === '18') {
        // Solo hasta 18:30
        validMinutes = validMinutes.filter(m => parseInt(m) <= 30);
      }
    }
    // LÓGICA SÁBADO (9:30 - 13:30)
    else if (dayOfWeek === 6) {
      if (selectedHour === '09') {
        // Solo desde 9:30
        validMinutes = validMinutes.filter(m => parseInt(m) >= 30);
      } else if (selectedHour === '13') {
        // Solo hasta 13:30
        validMinutes = validMinutes.filter(m => parseInt(m) <= 30);
      }
    }

    setAvailableMinutes(validMinutes);

    // Si el minuto seleccionado ya no es válido, resetear
    if (!validMinutes.includes(selectedMinute)) {
      setSelectedMinute('');
    }

  }, [selectedDate, selectedHour, selectedMinute]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. INICIALIZACIÓN INTELIGENTE (Modo Edición)
  useEffect(() => {
    if (initialDateISO && days.length > 0) {
      const d = new Date(initialDateISO);
      const datePart = d.toISOString().split('T')[0];
      const hourPart = d.getHours().toString().padStart(2, '0');
      
      // Encontrar minuto más cercano a 5
      const rawMin = d.getMinutes();
      const roundedMin = Math.round(rawMin / 5) * 5;
      const minPart = (roundedMin === 60 ? 55 : roundedMin).toString().padStart(2, '0');

      // 1. Setear Fecha
      // Verificamos si la fecha original es válida (ej: no es domingo). Si no, usamos la primera disponible.
      const isValidDate = days.some(day => day.value === datePart);
      if (isValidDate) {
        setSelectedDate(datePart);
        
        // Esperamos un tick para setear hora y minuto (para que los effects de arriba corran)
        // O simplemente los seteamos y dejamos que la validación de los effects los corrija si están mal
        setSelectedHour(hourPart);
        setSelectedMinute(minPart);
      } else {
        setSelectedDate(days[0].value);
      }
    }
  }, [initialDateISO, days]);

  // Construir ISO final
  const getFullIsoDate = () => {
    if (!selectedDate || !selectedHour || !selectedMinute) return null;
    return `${selectedDate}T${selectedHour}:${selectedMinute}:00`;
  };

  return {
    days,
    availableHours,
    availableMinutes,
    selectedDate,
    selectedHour,
    selectedMinute,
    setSelectedDate,
    setSelectedHour,
    setSelectedMinute,
    getFullIsoDate
  };
};