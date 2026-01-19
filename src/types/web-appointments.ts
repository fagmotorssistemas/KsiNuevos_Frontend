import { Database } from '@/types/supabase';

// Tipos base de la base de datos
type WebAppointmentRow = Database['public']['Tables']['web_appointments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Inventory = Database['public']['Tables']['inventory']['Row'];
type SellRequest = Database['public']['Tables']['web_sell_requests']['Row'];

// Tipo enriquecido con las relaciones (Joins)
export interface WebAppointmentWithDetails extends WebAppointmentRow {
    client: Profile | null;               // El cliente que agendó
    responsible: Profile | null;          // El vendedor asignado (puede ser null)
    vehicle_buying?: Inventory | null;    // El auto que quieren comprar (si aplica)
    vehicle_selling?: SellRequest | null; // El auto que nos quieren vender (si aplica)
}

export type WebAppointmentFilter = 'all' | 'pending' | 'confirmed' | 'completed';