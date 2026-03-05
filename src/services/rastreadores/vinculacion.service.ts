import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';

/**
 * Obtiene ventas (y sus GPS) por nota_venta. Misma forma que getGPSPorCliente para HistorialGPS.
 * Fuente: ventas_rastreador + gps_inventario (contratos AUTO/Oracle).
 */
export async function getGPSPorVenta(notaVenta: string) {
    try {
        const nota = limpiarTexto(notaVenta);
        if (!nota) return [];

        const { data, error } = await supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                gps_id,
                instalador_id,
                costo_instalacion,
                fecha_entrega,
                asesor_id,
                observacion,
                url_comprobante_pago,
                gps_inventario:gps_inventario(*, modelo:gps_modelos(marca, gps_proveedores(nombre)), gps_sims(iccid, imsi)),
                gps_instaladores:gps_instaladores(*)
            `)
            .eq('nota_venta', nota)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error obteniendo GPS por venta:", error);
            return [];
        }
        return mapVentasToHistorial(data || []);
    } catch (err) {
        console.error("Error critico en getGPSPorVenta:", err);
        return [];
    }
}

/**
 * Obtiene ventas del cliente externo por cliente_id (relación directa). No depende de cédula/RUC.
 * Usar para venta externa cuando tenemos clienteExternoId.
 */
export async function getGPSPorClienteId(clienteId: string) {
    try {
        const id = limpiarTexto(clienteId);
        if (!id) return [];
        const { data, error } = await supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                gps_id,
                instalador_id,
                costo_instalacion,
                fecha_entrega,
                asesor_id,
                observacion,
                url_comprobante_pago,
                gps_inventario:gps_inventario(*, modelo:gps_modelos(marca, gps_proveedores(nombre)), gps_sims(iccid, imsi)),
                gps_instaladores:gps_instaladores(*)
            `)
            .eq('cliente_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error obteniendo GPS por cliente_id:", error);
            return [];
        }
        return mapVentasToHistorial(data || []);
    } catch (err) {
        console.error("Error critico en getGPSPorClienteId:", err);
        return [];
    }
}

function mapVentasToHistorial(data: any[]) {
    return data.map((v: any) => {
        const gps = v.gps_inventario;
        const modeloGps = gps?.modelo;
        const modeloRaw = Array.isArray(modeloGps) ? modeloGps[0] : modeloGps;
        const modeloNombre = modeloRaw?.marca ?? gps?.serie ?? null;
        const prov = modeloRaw?.gps_proveedores ?? modeloRaw?.proveedor;
        const proveedorObj = Array.isArray(prov) ? prov[0] : prov;
        const sims = gps?.gps_sims;
        const sim = Array.isArray(sims) ? sims[0] : sims;
        return {
            id: gps?.id ?? v.gps_id,
            venta_id: v.id,
            nota_venta: v.nota_venta,
            precio_venta: v.precio_total,
            precio_total: v.precio_total,
            created_at: v.created_at,
            fecha_entrega: v.fecha_entrega ?? null,
            asesor_id: v.asesor_id ?? null,
            imei: gps?.imei,
            estado: gps?.estado,
            modelo: modeloNombre,
            costo_compra: gps?.costo_compra,
            instalador_id: v.instalador_id,
            costo_instalacion: v.costo_instalacion,
            gps_instaladores: v.gps_instaladores,
            gps_sims: sim ? { iccid: sim.iccid, imsi: sim.imsi ?? null } : null,
            proveedor: proveedorObj ? { nombre: proveedorObj.nombre } : null,
            observacion: v.observacion ?? null,
            url_comprobante_pago: v.url_comprobante_pago ?? null
        };
    });
}

/**
 * Obtiene ventas del cliente externo por identificación. Fuente: ventas_rastreador (cliente_id → clientes_externos) + gps_inventario.
 */
export async function getGPSPorCliente(identificacionCliente: string) {
    try {
        const iden = limpiarTexto(identificacionCliente);
        const { data: clientes } = await supabase
            .from('clientes_externos')
            .select('id')
            .eq('identificacion', iden);

        if (!clientes?.length) return [];

        const clienteIds = clientes.map((c: { id: string }) => c.id);
        const { data, error } = await supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                gps_id,
                instalador_id,
                costo_instalacion,
                fecha_entrega,
                asesor_id,
                observacion,
                url_comprobante_pago,
                gps_inventario:gps_inventario(*, modelo:gps_modelos(marca, gps_proveedores(nombre)), gps_sims(iccid, imsi)),
                gps_instaladores:gps_instaladores(*)
            `)
            .in('cliente_id', clienteIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error obteniendo GPS por cliente:", error);
            return [];
        }
        return mapVentasToHistorial(data || []);
    } catch (err) {
        console.error("Error critico en getGPSPorCliente:", err);
        return [];
    }
}

/**
 * Actualiza nota_venta de una venta por gps_id (ventas_rastreador).
 */
export async function actualizarVinculacionGPS(gpsId: string, notaVenta: string) {
    try {
        const { data, error } = await supabase
            .from('ventas_rastreador')
            .update({ nota_venta: limpiarTexto(notaVenta) })
            .eq('gps_id', gpsId)
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
 * Agrega nuevas URLs de evidencia a una venta existente.
 */
export async function agregarEvidenciasVenta(ventaId: string, urlsActuales: string | null, nuevasUrls: string[]) {
    try {
        const urlsPrevias = urlsActuales ? urlsActuales.split(',').filter(Boolean) : [];
        const todasLasUrls = [...urlsPrevias, ...nuevasUrls].join(',');

        const { data, error } = await supabase
            .from('ventas_rastreador')
            .update({ url_comprobante_pago: todasLasUrls || null })
            .eq('id', ventaId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error agregando evidencias a venta:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Lista ventas con GPS. Fuente: ventas_rastreador + clientes_externos + gps_inventario.
 */
export async function obtenerVentasConGPS(origen: 'AUTO' | 'EXTERNO' | 'TODOS' = 'TODOS') {
    try {
        let query = supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                gps_id,
                costo_instalacion,
                es_venta_externa,
                instalador_id,
                cliente_externo:clientes_externos(*),
                gps_inventario:gps_inventario(*),
                gps_instaladores:gps_instaladores(*)
            `)
            .order('created_at', { ascending: false });

        if (origen === 'EXTERNO') query = query.eq('es_venta_externa', true);
        if (origen === 'AUTO') query = query.eq('es_venta_externa', false);

        const { data, error } = await query;
        if (error) {
            console.error("Error obteniendo ventas con GPS:", error);
            return [];
        }

        const gpsInv = (v: any) => Array.isArray(v.gps_inventario) ? v.gps_inventario[0] : v.gps_inventario;
        return (data || []).map((v: any) => {
            const gps = gpsInv(v);
            return {
                id: gps?.id ?? v.gps_id,
                nota_venta: v.nota_venta,
                identificacion_cliente: v.cliente_externo?.identificacion,
                imei: gps?.imei,
                modelo: gps?.serie,
                precio_venta: v.precio_total,
                costo_instalacion: v.costo_instalacion,
                created_at: v.created_at,
                es_venta_externa: v.es_venta_externa,
                estado: gps?.estado,
                estado_coneccion: gps?.estado_coneccion ?? 'offline',
                sim_id: null,
                instalador_id: v.instalador_id,
                cliente_externo: v.cliente_externo,
                gps_sims: null,
                gps_instaladores: v.gps_instaladores
            };
        });
    } catch (err) {
        console.error("Error critico en obtenerVentasConGPS:", err);
        return [];
    }
}

/**
 * Actualiza estado del GPS en gps_inventario (ya no en dispositivos_rastreo).
 */
export async function actualizarEstadoGPS(gpsId: string, nuevoEstado: string) {
    try {
        const { data, error } = await supabase
            .from('gps_inventario')
            .update({ estado: nuevoEstado })
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
