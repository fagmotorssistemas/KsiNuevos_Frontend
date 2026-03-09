// src/services/seguros.service.ts
import { createClient } from '@supabase/supabase-js';
import { parseMoneda } from "@/utils/format"; // Asegúrate que esta utilidad exista
import { SeguroVehicular } from "@/types/seguros.types";

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURACIÓN API LEGACY ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

import type { SeguroPayload } from "@/types/seguros.types";
export type { SeguroPayload } from "@/types/seguros.types";

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
        // VALOR TOTAL en esta pantalla = solo valor del seguro (totSeguroTrans / valSeguro).
        // valores.seguro = seguro, valores.rastreo = rastreador; total = solo seguro para coherencia en vista de seguros.
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
                        total: valSeguro  // Solo valor del seguro (pantalla de seguros vehiculares)
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
     * Obtiene la póliza registrada en seguros_polizas para una nota de venta (venta/emitida).
     * Incluye nombres de aseguradora y broker por join.
     */
    async obtenerPolizaRegistrada(notaVenta: string) {
        const { data, error } = await supabase
            .from('seguros_polizas')
            .select('*, aseguradora:aseguradoras(nombre), broker:brokers(nombre)')
            .eq('nota_venta', notaVenta.trim())
            .eq('vendido', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (error) {
            console.error("Supabase Error (obtenerPoliza):", error);
            throw error;
        }
        return data;
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
     * Crea un registro en seguros_polizas (venta/emisión o renovación = otra compra).
     */
    async crearPoliza(payload: SeguroPayload) {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            const vigenciaHasta = payload.vigencia_hasta ?? (() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 1);
                return d.toISOString().split('T')[0];
            })();
            const { data, error } = await supabase
                .from('seguros_polizas')
                .insert([{ 
                    nota_venta: payload.nota_venta.trim(),
                    aseguradora_id: payload.aseguradora_id || null,
                    broker_id: payload.broker_id || null,
                    plan_tipo: payload.plan_tipo?.trim() || null,
                    costo_compra: payload.costo_compra ?? 0,
                    precio_venta: payload.precio_venta ?? 0,
                    fecha_venta: payload.fecha_venta ?? hoy,
                    vigencia_desde: payload.vigencia_desde ?? hoy,
                    vigencia_hasta: vigenciaHasta,
                    evidencias: payload.evidencias ?? [],
                    observaciones_venta: payload.observaciones_venta?.trim() || null,
                    vendido: true,
                    activo: true,
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
     * Actualiza un registro existente en seguros_polizas (id = uuid).
     */
    async actualizarPoliza(id: string, payload: Partial<SeguroPayload>) {
        try {
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (payload.aseguradora_id !== undefined) updateData.aseguradora_id = payload.aseguradora_id || null;
            if (payload.broker_id !== undefined) updateData.broker_id = payload.broker_id || null;
            if (payload.plan_tipo !== undefined) updateData.plan_tipo = payload.plan_tipo?.trim() || null;
            if (payload.costo_compra !== undefined) updateData.costo_compra = payload.costo_compra;
            if (payload.precio_venta !== undefined) updateData.precio_venta = payload.precio_venta;
            if (payload.evidencias) updateData.evidencias = payload.evidencias;
            if (payload.observaciones_venta !== undefined) updateData.observaciones_venta = payload.observaciones_venta?.trim() || null;

            const { data, error } = await supabase
                .from('seguros_polizas')
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