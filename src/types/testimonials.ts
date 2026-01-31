import { Database } from './supabase'; // Ajusta la ruta si es necesario

// Extraemos los tipos base de las filas para no repetirlos
type TestimonialRow = Database['public']['Tables']['web_testimonials']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type InventoryRow = Database['public']['Tables']['inventory']['Row'];

/**
 * Interfaz extendida para testimonios que incluye 
 * las relaciones cargadas mediante .select()
 */
export interface TestimonialWithRelations extends TestimonialRow {
  profiles: {
    full_name: ProfileRow['full_name'];
  } | null;
  inventory: {
    brand: InventoryRow['brand'];
    model: InventoryRow['model'];
  } | null;
}