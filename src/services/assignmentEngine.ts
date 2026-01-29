import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const assignmentEngine = {
  /**
   * REGLA 3: Afinidad de Cliente.
   * Si el cliente ya existe en el historial, se le asigna a su vendedor original.
   */
  async findPreviousSeller(clientId: string): Promise<string | null> {
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
   * Reparte uno a uno siguiendo el orden de la lista de vendedores.
   */
  async getNextSellerInCircle(): Promise<string | null> {
    // 1. Obtener vendedores activos ordenados por ID
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'vendedor')
      .eq('status', 'activo')
      .order('id', { ascending: true });

    if (!sellers || sellers.length === 0) return null;

    // 2. Buscar quién recibió la última cita (sin importar el cliente)
    const { data: lastAssignment } = await supabase
      .from('web_appointments')
      .select('responsible_id')
      .not('responsible_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastSellerId = lastAssignment?.[0]?.responsible_id;

    // Si nadie ha recibido citas, empezamos por el primero
    if (!lastSellerId) return sellers[0].id;

    // 3. Lógica del círculo: encontrar el siguiente índice
    const lastIndex = sellers.findIndex(s => s.id === lastSellerId);
    
    // Si el último vendedor ya no está activo, empezamos de nuevo o tomamos el primero
    if (lastIndex === -1) return sellers[0].id;

    const nextIndex = (lastIndex + 1) % sellers.length;
    return sellers[nextIndex].id;
  },

  /**
   * Proceso de asignación automática al cargar la agenda.
   */
  async assignAutomatically(appointmentId: number, clientId: string) {
    try {
      // 1. ¿Es cliente recurrente? (Afinidad)
      let sellerId = await this.findPreviousSeller(clientId);

      // 2. Si es nuevo, aplicar turno riguroso (Round-Robin)
      if (!sellerId) {
        sellerId = await this.getNextSellerInCircle();
      }

      if (sellerId) {
        const { error } = await supabase
          .from('web_appointments')
          .update({ 
            responsible_id: sellerId,
            status: 'pendiente', // Se mantiene pendiente para acción del vendedor
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