import { Database } from '@/types/supabase';

// Tipos base de la base de datos
type WebAppointmentRow = Database['public']['Tables']['web_appointments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Inventory = Database['public']['Tables']['inventory']['Row'];
type SellRequest = Database['public']['Tables']['web_sell_requests']['Row'];

/**
 * Los estados exactos que maneja la base de datos (ENUM)
 * Basado en la lógica de appointment.service.ts y useAppointments.ts
 */
export type WebAppointmentStatus = 
    | 'pendiente' 
    | 'aceptado' 
    | 'cancelado' 
    | 'reprogramado' 
    | 'atendido';

// Tipo enriquecido con las relaciones (Joins)
export interface WebAppointmentWithDetails extends Omit<WebAppointmentRow, 'status'> {
    status: WebAppointmentStatus;         // Sobrescribimos con el tipo exacto
    client: Profile | null;               // El cliente que agendó
    responsible: Profile | null;          // El vendedor asignado (puede ser null)
    vehicle_buying?: Inventory | null;    // El auto que quieren comprar (si aplica)
    vehicle_selling?: SellRequest | null; // El auto que nos quieren vender (si aplica)
}

/**
 * Filtros para la interfaz de usuario
 */
export type WebAppointmentFilter = 'all' | 'pendiente' | 'aceptado' | 'cancelado';