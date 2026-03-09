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

/** Alineado con seguros_polizas (aseguradora_id, broker_id) */
export interface RegistroSeguroPayload {
  nota_venta: string;
  aseguradora_id: string;
  broker_id: string;
  plan_tipo: string;
  costo_compra: number;
  precio_venta: number;
  evidencias?: string[];
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
        .from('gps_inventario')
        .insert([{
          imei: payload.imei.trim().toUpperCase(),
          costo_compra: payload.costo_compra,
          estado: 'VENDIDO',
          ubicacion: `CLIENTE: ${payload.identificacion_cliente.trim()}`
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
        .from('ventas_rastreador')
        .select('*, gps_inventario(*), cliente_externo:clientes_externos(*)')
        .eq('nota_venta', notaVenta.trim());
    if (error) throw error;
    return data ?? [];
  },

  // ==========================================
  // 2. GESTIÓN DE SEGUROS
  // ==========================================

  async registrarSeguro(payload: RegistroSeguroPayload) {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const vigenciaHasta = new Date();
      vigenciaHasta.setFullYear(vigenciaHasta.getFullYear() + 1);
      const { data, error } = await supabase
        .from('seguros_polizas')
        .insert([{
          nota_venta: payload.nota_venta.trim(),
          aseguradora_id: payload.aseguradora_id || null,
          broker_id: payload.broker_id || null,
          plan_tipo: payload.plan_tipo?.trim() || null,
          costo_compra: payload.costo_compra ?? 0,
          precio_venta: payload.precio_venta ?? 0,
          fecha_venta: hoy,
          vigencia_desde: hoy,
          vigencia_hasta: vigenciaHasta.toISOString().split('T')[0],
          evidencias: payload.evidencias ?? [],
          vendido: true,
          activo: true,
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
      .from('seguros_polizas')
      .select('*, aseguradora:aseguradoras(nombre), broker:brokers(nombre)')
      .eq('nota_venta', notaVenta.trim())
      .eq('vendido', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // ==========================================
  // 3. ACTUALIZACIÓN (UPDATE) - NUEVO
  // ==========================================

  async actualizarRastreador(id: string | number, payload: Partial<RegistroGPSPayload>) {
    try {
      const updateData: Record<string, unknown> = {};
      if (payload.imei != null) updateData.imei = payload.imei.trim().toUpperCase();
      if (payload.costo_compra != null) updateData.costo_compra = payload.costo_compra;

      const { data, error } = await supabase
        .from('gps_inventario')
        .update(updateData)
        .eq('id', String(id))
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ Error actualizando rastreador:", error.message);
      return { success: false, error: error.message };
    }
  },

  async actualizarSeguro(id: string, payload: Partial<RegistroSeguroPayload>) {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.aseguradora_id !== undefined) updateData.aseguradora_id = payload.aseguradora_id || null;
      if (payload.broker_id !== undefined) updateData.broker_id = payload.broker_id || null;
      if (payload.plan_tipo !== undefined) updateData.plan_tipo = payload.plan_tipo?.trim() || null;
      if (payload.costo_compra !== undefined) updateData.costo_compra = payload.costo_compra;
      if (payload.precio_venta !== undefined) updateData.precio_venta = payload.precio_venta;
      if (payload.evidencias) updateData.evidencias = payload.evidencias;

      const { data, error } = await supabase
        .from('seguros_polizas')
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