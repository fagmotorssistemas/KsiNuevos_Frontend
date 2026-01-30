// src/types/web-appointments.ts
import { Database } from '@/types/supabase';

// Tipos base de la base de datos
type WebAppointmentRow = Database['public']['Tables']['web_appointments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Inventory = Database['public']['Tables']['inventory']['Row'];
type SellRequest = Database['public']['Tables']['web_sell_requests']['Row'];

/**
 * Los estados exactos que maneja la base de datos (ENUM)
 */
export type WebAppointmentStatus = 
    | 'pendiente' 
    | 'aceptado' 
    | 'cancelado' 
    | 'reprogramado' 
    | 'atendido';

// Tipo enriquecido con las relaciones (Joins)
export interface WebAppointmentWithDetails extends Omit<WebAppointmentRow, 'status'> {
    status: WebAppointmentStatus;
    client: Profile | null;
    responsible: Profile | null;
    vehicle_buying?: Inventory | null;
    vehicle_selling?: SellRequest | null;
}

/**
 * Filtros para la interfaz de usuario
 * Se añade 'aceptado' y 'reprogramado' para cubrir más estados si es necesario
 */
export type WebAppointmentFilter = 'all' | 'pendiente' | 'aceptado' | 'cancelado' | 'atendido' | 'reprogramado';

export type SortOrder = 'newest' | 'oldest';