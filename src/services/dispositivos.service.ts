import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Interfaces de Carga de Datos (Payloads) ---

export interface RegistroGPSPayload {
  identificacion_cliente: string;
  nota_venta: string;
  imei: string;
  modelo: string;
  tipo_dispositivo: string;
  costo_compra: number;
  precio_venta: number;
  proveedor: string;     // Nuevo campo solicitado
  pagado: boolean;       // Nuevo campo solicitado
  metodo_pago: string;   // Nuevo campo solicitado
}

export interface RegistroSeguroPayload {
  identificacion_cliente: string;
  nota_venta: string;
  broker: string;
  aseguradora: string;
  tipo_seguro: string;
  costo_seguro: number;
  precio_venta: number;
}

export const dispositivosService = {
  
  // ==========================================
  // 1. GESTIÓN DE RASTREADORES (GPS)
  // ==========================================

  /**
   * Registra un nuevo dispositivo de rastreo en Supabase.
   * Los nombres de los campos coinciden con la tabla 'dispositivos_rastreo'.
   */
  async registrarRastreador(payload: RegistroGPSPayload) {
    try {
      const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .insert([{ 
          identificacion_cliente: payload.identificacion_cliente.trim(),
          nota_venta: payload.nota_venta.trim(),
          imei: payload.imei.trim().toUpperCase(),
          modelo: payload.modelo.trim(),
          tipo_dispositivo: payload.tipo_dispositivo.trim(),
          costo_compra: payload.costo_compra,
          precio_venta: payload.precio_venta,
          // Nuevos campos de gestión técnica
          proveedor: payload.proveedor.trim(),
          pagado: payload.pagado,
          metodo_pago: payload.metodo_pago.trim()
        }])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ Error al registrar rastreador:", error.message);
      return { success: false, error: error.message };
    }
  },

  async obtenerRastreadoresPorNota(notaVenta: string) {
    try {
      const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .select('*')
        .eq('nota_venta', notaVenta.trim());

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("❌ Error al obtener rastreadores:", error.message);
      return [];
    }
  },

  // ==========================================
  // 2. GESTIÓN DE SEGUROS
  // ==========================================

  /**
   * Registra una nueva auditoría de seguro en Supabase.
   * Los nombres de los campos coinciden con la tabla 'seguros_contratos'.
   */
  async registrarSeguro(payload: RegistroSeguroPayload) {
    try {
      const { data, error } = await supabase
        .from('seguros_contratos')
        .insert([{ 
          identificacion_cliente: payload.identificacion_cliente.trim(),
          nota_venta: payload.nota_venta.trim(),
          broker: payload.broker.trim(),
          aseguradora: payload.aseguradora.trim(),
          tipo_seguro: payload.tipo_seguro.trim(),
          costo_seguro: payload.costo_seguro,
          precio_venta: payload.precio_venta
        }])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ Error al registrar seguro:", error.message);
      return { success: false, error: error.message };
    }
  },

  async obtenerSegurosPorNota(notaVenta: string) {
    try {
      const { data, error } = await supabase
        .from('seguros_contratos')
        .select('*')
        .eq('nota_venta', notaVenta.trim());

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("❌ Error al obtener seguros:", error.message);
      return [];
    }
  }
};