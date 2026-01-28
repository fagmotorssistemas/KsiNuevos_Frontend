import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Mantenemos tus interfaces y utilidades intactas
interface CarItem {
  id: string | number;
  brand: string;
  model: string;
  year: number;
  image: string;
}

export interface Appointment {
  id: number;
  type: string;
  status: string;
  date: string;
  notes: string | null;
  inventory: CarItem | null;
  sell_request: CarItem | null;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (id: number) => void;
  onCancel: (id: number) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

export const AppointmentCard = ({ appointment, onEdit, onCancel }: AppointmentCardProps) => {
  const { id, inventory, sell_request, status, date } = appointment;
  const isEditable = ['pendiente', 'confirmada'].includes(status || '');
  const displayItem = inventory || sell_request;

  // Color del punto de estado según tu lógica
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmada': return 'bg-green-500';
      case 'pendiente': return 'bg-orange-400';
      case 'cancelada': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
      
      {/* --- IMAGEN MINIATURA (Lado Izquierdo) --- */}
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50">
        {displayItem?.image ? (
          <Image 
            src={displayItem.image} 
            alt={displayItem.model} 
            fill 
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl bg-gray-100">
            🚗
          </div>
        )}
      </div>

      {/* --- INFORMACIÓN CENTRAL --- */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-[15px] truncate">
          {displayItem 
            ? `${displayItem.brand} ${displayItem.model} ${displayItem.year}` 
            : 'Cita General'
          }
        </h3>
        <p className="text-gray-400 text-[13px] font-medium">
          {formatDate(date)}
        </p>

        {/* Estado con el punto de color */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
            {status}
          </span>
        </div>
      </div>

      {/* --- BOTONES DE ACCIÓN (Lado Derecho) --- */}
      <div className="flex flex-col gap-2 shrink-0">
        {isEditable && (
          <button 
            onClick={() => onEdit(id)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors"
          >
            Reprgrmar
          </button>
        )}
        
        {/* Lógica original de cancelación */}
        {isEditable && status !== 'confirmada' && (
          <button 
            onClick={() => onCancel(id)}
            className="bg-gray-50 hover:bg-gray-100 text-gray-400 px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors"
          >
            Canaclar
          </button>
        )}

        {/* Mantenemos tu link de detalles para inventario */}
        {inventory && (
          <Link 
            href={`/autos/${inventory.id}`} 
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 text-center uppercase tracking-tighter"
          >
            Detalles
          </Link>
        )}
      </div>
    </div>
  );
};