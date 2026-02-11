// src/types/requests.types.ts
import { Clock, CheckCircle2, Loader2, HelpCircle } from "lucide-react";

// 1. Enum de Estados (Exacto como en tu DB)
export type RequestStatus = 'pendiente' | 'en_proceso' | 'resuelto';

// 2. Interfaz de la fila de Base de Datos
export interface ClientRequestRow {
  id: number;
  lead_id: number;
  fecha_solicitud: string; // timestamp
  mensaje_completo: string;
  estado: RequestStatus;
  fecha_resolucion: string | null;
  notas_vendedor: string | null;
}

// 3. Configuración Visual de los Estados
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: any }> = {
  'pendiente': { 
    label: 'Pendiente', 
    color: 'bg-orange-100 text-orange-700 border-orange-200', 
    icon: Clock 
  },
  'en_proceso': { 
    label: 'En Proceso', 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: Loader2 
  },
  'resuelto': { 
    label: 'Resuelto', 
    color: 'bg-green-100 text-green-700 border-green-200', 
    icon: CheckCircle2 
  }
};