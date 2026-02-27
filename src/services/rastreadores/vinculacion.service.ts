import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';

/**
 * Obtiene el/los GPS vinculado(s) a una venta especifica
 * Incluye los datos de SIM e Instalador relacionados
 * @param notaVenta - Numero de venta (ej: "1000001234" o "EXT-1234567-1708700000")
 */
export async function getGPSPorVenta(notaVenta: string) {
    try {
        const { data, error } = await supabase
            .from('dispositivos_rastreo')
            .select(`
                *,
                gps_sims(*),
                gps_instaladores(*)
            `)
            .eq('nota_venta', notaVenta);

        if (error) {
            console.error("Error obteniendo GPS por venta:", error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error("Error critico en getGPSPorVenta:", err);
        return [];
    }
}

/**
 * Obtiene el GPS vinculado a un cliente especifico
 * Incluye los datos de SIM e Instalador relacionados
 * Util para ver si un cliente tiene GPS asociado
 */
export async function getGPSPorCliente(identificacionCliente: string) {
    try {
        const { data, error } = await supabase
            .from('dispositivos_rastreo')
            .select(`
                *,
                gps_sims(*),
                gps_instaladores(*)
            `)
            .eq('identificacion_cliente', limpiarTexto(identificacionCliente))
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error obteniendo GPS por cliente:", error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error("Error critico en getGPSPorCliente:", err);
        return [];
    }
}

/**
 * Actualiza la vinculacion de un GPS a una venta
 * Se usa cuando un GPS se asigna a una venta especifica
 */
export async function actualizarVinculacionGPS(gpsId: string, notaVenta: string) {
    try {
        const { data, error } = await supabase
            .from('dispositivos_rastreo')
            .update({
                nota_venta: notaVenta
            })
            .eq('id', gpsId)
            .select()
            .single();

        if (error) {
            console.error("Error actualizando vinculacion GPS:", error);
            throw error;
        }

        return { success: true, data };
    } catch (err) {
        console.error("Error critico en actualizarVinculacionGPS:", err);
        return { success: false, error: err };
    }
}

/**
 * Obtiene una lista de ventas con sus GPS vinculados
 * Incluye: Cliente, Venta, GPS comprado, SIM e Instalador
 */
export async function obtenerVentasConGPS(origen: 'AUTO' | 'EXTERNO' | 'TODOS' = 'TODOS') {
    try {
        const esExterna = origen === 'EXTERNO' ? true : origen === 'AUTO' ? false : null;
        let query = supabase
            .from('dispositivos_rastreo')
            .select(`
                id,
                nota_venta,
                identificacion_cliente,
                imei,
                modelo,
                precio_venta,
                costo_instalacion,
                created_at,
                es_venta_externa,
                estado,
                sim_id,
                instalador_id,
                cliente_externo:clientes_externos(*),
                gps_sims(*),
                gps_instaladores(*)
            `)
            .order('created_at', { ascending: false });

        if (esExterna !== null) {
            query = query.eq('es_venta_externa', esExterna);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error obteniendo ventas con GPS:", error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error("Error critico en obtenerVentasConGPS:", err);
        return [];
    }
}

/**
 * Actualiza el estado de un GPS
 * Estados: PENDIENTE_INSTALACION, INSTALADO, ACTIVO, SUSPENDIDO, RETIRADO
 */
export async function actualizarEstadoGPS(gpsId: string, nuevoEstado: string) {
    try {
        const { data, error } = await supabase
            .from('dispositivos_rastreo')
            .update({
                estado: nuevoEstado
            })
            .eq('id', gpsId)
            .select()
            .single();

        if (error) {
            console.error("Error actualizando estado GPS:", error);
            throw error;
        }

        return { success: true, data };
    } catch (err) {
        console.error("Error critico en actualizarEstadoGPS:", err);
        return { success: false, error: err };
    }
}
