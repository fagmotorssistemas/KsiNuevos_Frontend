import React, { useState } from 'react';
// Importamos el hook NUEVO y SEGURO
import { useTimeSelector } from '@/hooks/userProfile/useTimeSelector';

// Importamos tu componente visual EXISTENTE (Ajusta la ruta si es necesario)
import { TimePicker } from '../buyCar/carDetail/appointment/TimePicker';
interface EditAppointmentFormProps {
  initialData: {
    date: string;
    notes: string | null;
  };
  onSave: (data: { date: string; notes: string }) => Promise<void>;
  onCancel: () => void;
}

export const EditAppointmentForm = ({ initialData, onSave, onCancel }: EditAppointmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(initialData.notes || '');

  // Inicializamos el hook con la fecha de la cita
  const picker = useTimeSelector(initialData.date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Obtenemos la fecha combinada
    const finalDate = picker.getFullIsoDate();

    // Validaciones
    if (!finalDate || !picker.selectedHour || !picker.selectedMinute) {
      alert("Por favor selecciona una fecha y hora completa.");
      return;
    }

    setLoading(true);
    try {
      await onSave({ date: finalDate, notes });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* SECCIÓN 1: TU COMPONENTE TIMEPICKER */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <label className="text-xs font-bold text-gray-700 uppercase">
            Reprogramar Cita
          </label>
          {/* Badge informativo de selección */}
          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            {picker.selectedDate || '...'} • {picker.selectedHour || '--'}:{picker.selectedMinute || '--'}
          </span>
        </div>
        
        {/* Aquí pasamos los datos del hook nuevo a tu componente visual viejo */}
        <TimePicker 
          days={picker.days}
          availableHours={picker.availableHours}
          availableMinutes={picker.availableMinutes}
          selectedDate={picker.selectedDate}
          selectedHour={picker.selectedHour}
          selectedMinute={picker.selectedMinute}
          setSelectedDate={picker.setSelectedDate}
          setSelectedHour={picker.setSelectedHour}
          setSelectedMinute={picker.setSelectedMinute}
        />
      </div>

      {/* SECCIÓN 2: NOTAS */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 px-1">
          Notas / Motivo
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm resize-none bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400"
          placeholder="Ej: Cambio de horario por trabajo..."
        />
      </div>

      {/* SECCIÓN 3: BOTONES */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          disabled={loading || !picker.selectedHour}
        >
          {loading ? 'Guardando...' : 'Confirmar Cambio'}
        </button>
      </div>
    </form>
  );
};