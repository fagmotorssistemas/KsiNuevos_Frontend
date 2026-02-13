// src/services/seguros.service.ts
import { createClient } from '@supabase/supabase-js';
import { parseMoneda } from "@/utils/format"; // Asegúrate que esta utilidad exista
import { SeguroVehicular } from "@/types/seguros.types";

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURACIÓN API LEGACY ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

// --- INTERFACES PARA ESCRITURA (SUPABASE) ---
export interface SeguroPayload {
    identificacion_cliente: string;
    nota_venta: string;
    broker: string;
    aseguradora: string;
    tipo_seguro: string;
    costo_seguro: number;
    precio_venta: number;
    evidencias?: string[];
}

export const segurosService = {

    // ============================================================
    // 1. MÓDULO DE LECTURA (API LEGACY)
    // ============================================================
    
    async obtenerSeguros(): Promise<SeguroVehicular[]> {
        // 1. Obtener la lista base (Ids)
        const resList = await fetch(`${API_URL}/contratos/list`, { cache: 'no-store' });
        
        if (!resList.ok) {
            console.error("Error fetching list:", resList.statusText);
            return [];
        }
        
        const jsonList = await resList.json();
        const listaContratos = jsonList.data || [];

        // 2. Obtener el detalle de CADA contrato en paralelo
        const promesasDetalle = listaContratos.map(async (contrato: any) => {
            const id = contrato.ccoCodigo || contrato.ccoCodigoStr; 
            if (!id) return null;

            try {
                const resDetalle = await fetch(`${API_URL}/contratos/detalle/${id}`);
                if (!resDetalle.ok) return null; 
                const jsonDetalle = await resDetalle.json();
                return jsonDetalle.data;
            } catch (err) {
                console.error(`Error detalle ${id}`, err);
                return null;
            }
        });

        // Esperamos todas las peticiones
        const detallesCrudos = await Promise.all(promesasDetalle);

        // 3. Mapear y Filtrar
        const segurosProcesados: SeguroVehicular[] = detallesCrudos
            .filter(item => item !== null)
            .map(raw => {
                const valSeguro = parseMoneda(raw.totSeguroTrans);
                const valRastreo = parseMoneda(raw.totRastreador);
                
                const descripcionVehiculo = raw.vehiculo 
                    ? raw.vehiculo 
                    : `${raw.marca || ''} ${raw.modelo || ''}`.trim();

                return {
                    id: raw.ccoCodigo || raw.notaVenta,
                    referencia: raw.notaVenta,
                    fechaEmision: raw.fechaVentaFull || raw.fechaVenta,
                    
                    cliente: {
                        nombre: raw.cliente || raw.clienteNombre || raw.facturaNombre,
                        identificacion: raw.facturaRuc || raw.clienteId || 'S/I',
                        ubicacion: raw.ubicacion || raw.ciudadCliente || 'S/D'
                    },
    
                    bienAsegurado: {
                        descripcion: descripcionVehiculo || "Vehículo sin nombre",
                        tipo: raw.tipoVehiculo || 'N/A',
                        placa: raw.placa || 'En Trámite'
                    },
    
                    valores: {
                        seguro: valSeguro,
                        rastreo: valRastreo,
                        total: valSeguro + valRastreo
                    },
                    
                    estado: valSeguro > 0 ? 'ACTIVO' : 'PENDIENTE'
                };
            });

        // 4. Filtro Final: Solo mostramos los que tienen valor > 0
        return segurosProcesados.filter(s => s.valores.total > 0);
    },

    // ============================================================
    // 2. MÓDULO DE GESTIÓN (SUPABASE)
    // ============================================================

    /**
     * Verifica si ya existe una póliza registrada para una nota de venta específica.
     * Útil para decidir si mostrar el formulario en modo "Crear" o "Editar".
     */
    async obtenerPolizaRegistrada(notaVenta: string) {
        const { data, error } = await supabase
            .from('seguros_contratos')
            .select('*')
            .eq('nota_venta', notaVenta.trim())
            .maybeSingle();
        
        if (error) {
            console.error("Supabase Error (obtenerPoliza):", error);
            throw error;
        }
        return data; // Retorna el objeto si existe, o null si no.
    },

    /**
     * Sube múltiples archivos al bucket 'evidencias' carpeta 'seguros/'.
     * Retorna un array con las URLs públicas.
     */
    async subirEvidencias(files: File[]): Promise<string[]> {
        try {
            const uploadPromises = files.map(async (file) => {
                // Limpieza de nombre y timestamp para evitar colisiones
                const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileName = `seguros/${Date.now()}_${cleanName}`;

                // Subida
                const { error } = await supabase
                    .storage
                    .from('evidencias') 
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                // Obtención de URL Pública
                const { data } = supabase
                    .storage
                    .from('evidencias')
                    .getPublicUrl(fileName);
                    
                return data.publicUrl;
            });

            return await Promise.all(uploadPromises);

        } catch (error: any) {
            console.error("Supabase Error (subirEvidencias):", error.message);
            throw error;
        }
    },

    /**
     * Crea un nuevo registro en la tabla 'seguros_contratos'.
     */
    async crearPoliza(payload: SeguroPayload) {
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
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error: any) {
            console.error("Supabase Error (crearPoliza):", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Actualiza un registro existente en 'seguros_contratos'.
     */
    async actualizarPoliza(id: number, payload: Partial<SeguroPayload>) {
        try {
            // Construimos objeto de actualización dinámico para no borrar datos accidentalmente
            const updateData: any = {};
            if (payload.broker) updateData.broker = payload.broker.trim();
            if (payload.aseguradora) updateData.aseguradora = payload.aseguradora.trim();
            if (payload.tipo_seguro) updateData.tipo_seguro = payload.tipo_seguro.trim();
            if (payload.costo_seguro !== undefined) updateData.costo_seguro = payload.costo_seguro;
            if (payload.evidencias) updateData.evidencias = payload.evidencias;

            const { data, error } = await supabase
                .from('seguros_contratos')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error: any) {
            console.error("Supabase Error (actualizarPoliza):", error.message);
            return { success: false, error: error.message };
        }
    }
};