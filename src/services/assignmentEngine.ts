import { SupabaseClient } from '@supabase/supabase-js';

export const assignmentEngine = {
  /**
   * REGLA 3: Afinidad de Cliente.
   * Busca en el historial si el cliente ya tiene un vendedor asignado, recibiendo el cliente de Supabase como parámetro.
   */
  async findPreviousSeller(supabase: SupabaseClient, clientId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('web_appointments')
      .select('responsible_id')
      .eq('client_user_id', clientId)
      .not('responsible_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0].responsible_id;
  },

  /**
   * REGLA 2: Round-Robin Puro.
   * Determina el turno basándose en la última asignación global registrada en la base de datos.
   */
  async getNextSellerInCircle(supabase: SupabaseClient): Promise<string | null> {
    // 1. Obtener lista de vendedores aptos
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'vendedor')
      .eq('status', 'activo')
      .order('id', { ascending: true });

    if (!sellers || sellers.length === 0) return null;

    // 2. Identificar quién atendió la última cita registrada
    const { data: lastAssignment } = await supabase
      .from('web_appointments')
      .select('responsible_id')
      .not('responsible_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastSellerId = lastAssignment?.[0]?.responsible_id;

    if (!lastSellerId) return sellers[0].id;

    // 3. Calcular el siguiente en el círculo
    const lastIndex = sellers.findIndex(s => s.id === lastSellerId);
    
    if (lastIndex === -1) return sellers[0].id;

    const nextIndex = (lastIndex + 1) % sellers.length;
    return sellers[nextIndex].id;
  },

  /**
   * Método principal para determinar el responsable inyectando el cliente de base de datos.
   */
  async determineResponsible(supabase: SupabaseClient, clientId: string): Promise<string | null> {
    // Prioridad 1: Afinidad
    let sellerId = await this.findPreviousSeller(supabase, clientId);
    
    // Prioridad 2: Turno (Round-Robin)
    if (!sellerId) {
      sellerId = await this.getNextSellerInCircle(supabase);
    }
    
    return sellerId;
  },

  /**
   * Proceso de actualización para citas ya creadas (Agenda administrativa).
   */
  async assignAutomatically(supabase: SupabaseClient, appointmentId: number, clientId: string) {
    try {
      const sellerId = await this.determineResponsible(supabase, clientId);

      if (sellerId) {
        const { error } = await supabase
          .from('web_appointments')
          .update({ 
            responsible_id: sellerId,
            status: 'pendiente',
            updated_at: new Date().toISOString() 
          })
          .eq('id', appointmentId);
        
        if (error) throw error;
        return sellerId;
      }
    } catch (err) {
      console.error("Error en el motor de asignación:", err);
    }
    return null;
  }
};