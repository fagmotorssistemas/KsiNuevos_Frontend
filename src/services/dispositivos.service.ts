import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Interfaces Actualizadas ---

export interface RegistroGPSPayload {
  identificacion_cliente: string;
  nota_venta: string;
  imei: string;
  modelo: string;
  tipo_dispositivo: string;
  costo_compra: number;
  precio_venta: number;
  proveedor: string;
  pagado: boolean;
  metodo_pago: string;
  evidencias?: string[]; // Array de URLs
}

export interface RegistroSeguroPayload {
  identificacion_cliente: string;
  nota_venta: string;
  broker: string;
  aseguradora: string;
  tipo_seguro: string;
  costo_seguro: number;
  precio_venta: number;
  evidencias?: string[]; // Array de URLs
}

export const dispositivosService = {
  
  // ==========================================
  // 0. SUBIDA MÚLTIPLE DE ARCHIVOS
  // ==========================================
  async subirEvidencias(files: File[], carpeta: 'gps' | 'seguros'): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${carpeta}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase
          .storage
          .from('evidencias') 
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase
          .storage
          .from('evidencias')
          .getPublicUrl(fileName);
          
        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      return urls;

    } catch (error: any) {
      console.error("❌ Error subiendo archivos:", error.message);
      return []; 
    }
  },

  // ==========================================
  // 1. GESTIÓN DE RASTREADORES (GPS)
  // ==========================================

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
          proveedor: payload.proveedor.trim(),
          pagado: payload.pagado,
          metodo_pago: payload.metodo_pago.trim(),
          evidencias: payload.evidencias || [] 
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
    const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .select('*')
        .eq('nota_venta', notaVenta.trim());
    if (error) throw error;
    return data;
  },

  // ==========================================
  // 2. GESTIÓN DE SEGUROS
  // ==========================================

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
          precio_venta: payload.precio_venta,
          evidencias: payload.evidencias || [] 
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
    const { data, error } = await supabase
        .from('seguros_contratos')
        .select('*')
        .eq('nota_venta', notaVenta.trim());
    if (error) throw error;
    return data;
  },

  // ==========================================
  // 3. ACTUALIZACIÓN (UPDATE) - NUEVO
  // ==========================================

  async actualizarRastreador(id: number, payload: Partial<RegistroGPSPayload>) {
    try {
      // Preparamos el objeto para actualizar, limpiando strings si vienen
      const updateData: any = { ...payload };
      if (payload.imei) updateData.imei = payload.imei.trim().toUpperCase();
      if (payload.modelo) updateData.modelo = payload.modelo.trim();
      if (payload.tipo_dispositivo) updateData.tipo_dispositivo = payload.tipo_dispositivo.trim();
      if (payload.proveedor) updateData.proveedor = payload.proveedor.trim();
      if (payload.metodo_pago) updateData.metodo_pago = payload.metodo_pago.trim();

      const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ Error actualizando rastreador:", error.message);
      return { success: false, error: error.message };
    }
  },

  async actualizarSeguro(id: number, payload: Partial<RegistroSeguroPayload>) {
    try {
      const updateData: any = { ...payload };
      if (payload.broker) updateData.broker = payload.broker.trim();
      if (payload.aseguradora) updateData.aseguradora = payload.aseguradora.trim();
      if (payload.tipo_seguro) updateData.tipo_seguro = payload.tipo_seguro.trim();

      const { data, error } = await supabase
        .from('seguros_contratos')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ Error actualizando seguro:", error.message);
      return { success: false, error: error.message };
    }
  }
};