import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/userProfile/StatusBadge'; 

// Definimos una interfaz genérica para los datos visuales del auto
// Esto nos permite usar la misma estructura sea Inventario o Solicitud
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
  inventory: CarItem | null;     // Datos si es compra (Tu inventario)
  sell_request: CarItem | null;  // Datos si es venta (Auto del cliente) - NUEVO
}

// DEFINIMOS LAS PROPS
interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (id: number) => void;
  onCancel: (id: number) => void;
}

// Utilidad de Fecha
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Utilidad de Color
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'confirmada': return 'success';
    case 'pendiente': return 'warning';
    case 'completada': return 'info';
    case 'cancelada': return 'danger';
    default: return 'default';
  }
};

export const AppointmentCard = ({ appointment, onEdit, onCancel }: AppointmentCardProps) => {
  // 1. Desestructuramos también sell_request
  const { id, inventory, sell_request, type, status, date, notes } = appointment;

  const isEditable = ['pendiente', 'confirmada'].includes(status || '');

  // 2. Lógica de Visualización:
  // Si existe inventario, lo mostramos. Si no, mostramos la solicitud de venta.
  const displayItem = inventory || sell_request;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row">
      
      {/* --- COLUMNA IZQUIERDA: IMAGEN --- */}
      <div className="sm:w-48 h-40 sm:h-auto bg-gray-100 relative shrink-0">
        {displayItem ? (
          <Image 
            src={displayItem.image} 
            alt={displayItem.model} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 flex-col gap-2 p-4 text-center">
            <span className="text-2xl">🤝</span>
            <span className="text-xs font-bold text-gray-400 uppercase">Cita General</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
           <StatusBadge variant={type === 'compra' ? 'default' : 'dark'}>{type}</StatusBadge>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: CONTENIDO --- */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-900 text-lg">
              {/* Título dinámico dependiendo del tipo de cita */}
              {displayItem 
                ? `${displayItem.brand} ${displayItem.model} ${displayItem.year}` 
                : 'Asesoría / Venta'
              }
            </h3>
            <StatusBadge variant={getStatusVariant(status)}>{status}</StatusBadge>
          </div>
          
          <p className="text-sm text-gray-500 flex items-center gap-2 font-medium">
            📅 {formatDate(date)}
          </p>
          
          {notes && (
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 italic">
              "{notes}"
            </div>
          )}
        </div>

        {/* --- FOOTER: BOTONES DE ACCIÓN --- */}
        <div className="mt-4 flex items-center justify-end gap-2 pt-4 border-t border-gray-100 flex-wrap">
          
          {isEditable && (
            <>
              <button 
                onClick={() => onCancel(id)}
                className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button 
                onClick={() => onEdit(id)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
              >
                Reprogramar
              </button>
            </>
          )}

          {/* El botón "Ver Detalles" SOLO se muestra si es de INVENTARIO (Compra) 
              porque los autos de los clientes (venta) no tienen link público */}
          {inventory && (
            <Link 
              href={`/autos/${inventory.id}`} 
              className="text-xs font-bold text-neutral-900 hover:text-black uppercase tracking-wide flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-auto sm:ml-0"
            >
              Ver Detalles &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};