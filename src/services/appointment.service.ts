import { createClient } from '@/lib/supabase/client';
import { WebAppointmentWithDetails } from '@/types/web-appointments';

const supabase = createClient();

export const appointmentService = {
  async getWebAppointments(): Promise<WebAppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('web_appointments')
      .select(`
        *,
        client:profiles!web_appointments_client_user_id_fkey(*),
        responsible:profiles!web_appointments_responsible_id_fkey(*),
        vehicle_buying:inventory(*),
        vehicle_selling:web_sell_requests(*)
      `)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error al obtener citas:', error);
      return [];
    }

    return data as unknown as WebAppointmentWithDetails[];
  },

  async updateAppointmentStatus(id: number, status: 'pendiente' | 'aceptado' | 'cancelado' | 'reprogramado' | 'atendido') {
    const { error } = await supabase
      .from('web_appointments')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- NUEVA IMPLEMENTACIÓN ---
  async updateAppointmentNotes(id: number, notes: string) {
    const { error } = await supabase
      .from('web_appointments')
      .update({ 
        notes, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) {
        console.error('Error al actualizar notas:', error);
        throw error;
    }
  }
};