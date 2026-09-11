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
                url_evidencia_gps,
                estado_dispositivo,
                motivo_baja,
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
                url_evidencia_gps,
                estado_dispositivo,
                motivo_baja,
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
        const gpsRaw = v.gps_inventario;
        const gps = Array.isArray(gpsRaw) ? gpsRaw[0] : gpsRaw;
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
            estado: v.estado_dispositivo ?? gps?.estado,
            modelo: modeloNombre,
            costo_compra: gps?.costo_compra,
            instalador_id: v.instalador_id,
            costo_instalacion: v.costo_instalacion,
            gps_instaladores: v.gps_instaladores,
            gps_sims: sim ? { iccid: sim.iccid, imsi: sim.imsi ?? null } : null,
            proveedor: proveedorObj ? { nombre: proveedorObj.nombre } : null,
            observacion: v.observacion ?? null,
            motivo_baja: v.motivo_baja ?? null,
            url_comprobante_pago: v.url_comprobante_pago ?? null,
            url_evidencia_gps: v.url_evidencia_gps ?? null
        };
    });
}

/** Tipo de evidencia: comprobante de pago o evidencia de instalación del rastreador */
export type TipoEvidenciaVenta = 'comprobante_pago' | 'evidencia_gps';

/**
 * Agrega nuevas URLs de evidencia a una venta (comprobante de pago o evidencia GPS).
 */
export async function agregarEvidenciasVenta(
    ventaId: string,
    urlsActuales: string | null,
    nuevasUrls: string[],
    tipo: TipoEvidenciaVenta = 'comprobante_pago'
) {
    try {
        const urlsPrevias = urlsActuales ? urlsActuales.split(',').filter(Boolean) : [];
        const todasLasUrls = [...urlsPrevias, ...nuevasUrls].join(',');
        const columna = tipo === 'evidencia_gps' ? 'url_evidencia_gps' : 'url_comprobante_pago';

        const { data, error } = await supabase
            .from('ventas_rastreador')
            .update({ [columna]: todasLasUrls || null })
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
                url_evidencia_gps,
                estado_dispositivo,
                motivo_baja,
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
            .in('estado_dispositivo', ['INSTALADO', 'VENDIDO', 'RMA'])
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
 * Lista ventas con GPS. Fuente: ventas_rastreador + clientes_externos + gps_inventario.
 * @param asesorId Si se pasa (vendedor), solo ventas con asesor_id = asesorId (sin asesor / null solo admin). Admin: no se pasa, sin filtro, ve todo.
 */
export async function obtenerVentasConGPS(origen: 'AUTO' | 'EXTERNO' | 'TODOS' = 'TODOS', asesorId?: string | null) {
    try {
        let query = supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                gps_id,
                cliente_id,
                costo_instalacion,
                es_venta_externa,
                estado_dispositivo,
                instalador_id,
                cliente_externo:clientes_externos(*),
                gps_inventario:gps_inventario(*),
                gps_instaladores:gps_instaladores(*),
                vehiculo:vehiculos(placa, marca, modelo)
            `)
            .order('created_at', { ascending: false });

        if (origen === 'EXTERNO') query = query.eq('es_venta_externa', true);
        if (origen === 'AUTO') query = query.eq('es_venta_externa', false);
        // Vendedor: solo sus ventas; asesor_id null solo admin (sin filtro).
        if (asesorId) query = query.eq('asesor_id', asesorId);

        const { data, error } = await query;
        if (error) {
            console.error("Error obteniendo ventas con GPS:", error);
            return [];
        }

        const gpsInv = (v: any) => Array.isArray(v.gps_inventario) ? v.gps_inventario[0] : v.gps_inventario;
        const clienteExt = (v: any) => Array.isArray(v.cliente_externo) ? v.cliente_externo[0] : v.cliente_externo;
        const vehiculo = (v: any) => Array.isArray(v.vehiculo) ? v.vehiculo[0] : v.vehiculo;
        const modeloGps = (gps: any) => {
            const m = gps?.modelo;
            const raw = Array.isArray(m) ? m[0] : m;
            return raw?.marca ?? gps?.serie ?? null;
        };
        return (data || []).map((v: any) => {
            const gps = gpsInv(v);
            const cliente = clienteExt(v);
            const veh = vehiculo(v);
            return {
                id: gps?.id ?? v.gps_id,
                venta_id: v.id,
                cliente_id: v.cliente_id ?? cliente?.id ?? null,
                nota_venta: v.nota_venta,
                identificacion_cliente: cliente?.identificacion ?? null,
                imei: gps?.imei,
                modelo: modeloGps(gps),
                placa: veh?.placa ?? null,
                marca: veh?.marca ?? null,
                modelo_vehiculo: veh?.modelo ?? null,
                precio_venta: v.precio_total,
                costo_instalacion: v.costo_instalacion,
                created_at: v.created_at,
                es_venta_externa: v.es_venta_externa,
                estado: v.estado_dispositivo ?? gps?.estado,
                estado_coneccion: gps?.estado_coneccion ?? 'offline',
                sim_id: null,
                instalador_id: v.instalador_id,
                cliente_externo: cliente,
                gps_sims: null,
                gps_instaladores: v.gps_instaladores
            };
        });
    } catch (err) {
        console.error("Error critico en obtenerVentasConGPS:", err);
        return [];
    }
}

const ESTADOS_LIBERA_STOCK = new Set(['BAJA', 'STOCK']);

export type MotivoBaja = 'RETIRO' | 'CONFUSION';

const NOTA_CONFUSION_IMEI = 'Confusión de IMEI: no es una venta extra; el precio no suma (mismo dispositivo).';

function payloadPorMotivoBaja(
    motivo: MotivoBaja | undefined,
    venta: { precio_total?: number | null; observacion?: string | null } | null
) {
    if (!motivo) return {} as { motivo_baja?: MotivoBaja; precio_total?: number; observacion?: string };
    const payload: { motivo_baja: MotivoBaja; precio_total?: number; observacion?: string } = { motivo_baja: motivo };
    if (motivo === 'CONFUSION') {
        payload.precio_total = 0;
        const obs = String(venta?.observacion ?? '').trim();
        if (!obs.includes('Confusión de IMEI')) {
            payload.observacion = [obs, NOTA_CONFUSION_IMEI].filter(Boolean).join(' · ');
        }
    }
    return payload;
}

/**
 * Clasifica una baja ya guardada (retiro vs confusión de IMEI).
 * Confusión deja precio en 0 para no inflar el valor de dispositivos.
 */
export async function registrarMotivoBaja(ventaId: string, motivo: MotivoBaja) {
    try {
        const { data: venta, error: readErr } = await supabase
            .from('ventas_rastreador')
            .select('id, precio_total, observacion, estado_dispositivo')
            .eq('id', ventaId)
            .single();
        if (readErr) throw readErr;

        const { error } = await supabase
            .from('ventas_rastreador')
            .update(payloadPorMotivoBaja(motivo, venta))
            .eq('id', ventaId);
        if (error) throw error;
        return { success: true as const, precio_total: motivo === 'CONFUSION' ? 0 : Number(venta?.precio_total ?? 0) };
    } catch (err) {
        console.error('Error registrando motivo de baja:', err);
        return { success: false as const, error: err };
    }
}

/**
 * Actualiza el estado del dispositivo en la venta.
 * Si es BAJA (o STOCK), el GPS vuelve a inventario para otra venta y esta venta queda como historial.
 */
export async function actualizarEstadoGPS(
    gpsId: string,
    nuevoEstado: string,
    ventaId?: string | null,
    motivoBaja?: MotivoBaja
) {
    try {
        const liberaStock = ESTADOS_LIBERA_STOCK.has(nuevoEstado);
        const estadoInventario = liberaStock ? 'STOCK' : nuevoEstado;

        if (ventaId) {
            const { data: ventaActual, error: ventaReadErr } = await supabase
                .from('ventas_rastreador')
                .select('id, gps_id, estado_dispositivo, precio_total, observacion')
                .eq('id', ventaId)
                .single();
            if (ventaReadErr) throw ventaReadErr;

            if (ESTADOS_LIBERA_STOCK.has(ventaActual?.estado_dispositivo ?? '') && !liberaStock) {
                return {
                    success: false,
                    error: 'Esta venta ya está dada de baja. El dispositivo volvió a stock y puede usarse en otra venta.'
                };
            }

            const { error: ventaErr } = await supabase
                .from('ventas_rastreador')
                .update({
                    estado_dispositivo: nuevoEstado,
                    ...(nuevoEstado === 'BAJA' ? payloadPorMotivoBaja(motivoBaja, ventaActual) : {})
                })
                .eq('id', ventaId);
            if (ventaErr) throw ventaErr;
        } else {
            const { error: ventaErr } = await supabase
                .from('ventas_rastreador')
                .update({ estado_dispositivo: nuevoEstado })
                .eq('gps_id', gpsId)
                .in('estado_dispositivo', ['INSTALADO', 'VENDIDO', 'RMA']);
            if (ventaErr) throw ventaErr;
        }

        if (liberaStock) {
            let hayVentaActivaQuery = supabase
                .from('ventas_rastreador')
                .select('id')
                .eq('gps_id', gpsId)
                .in('estado_dispositivo', ['INSTALADO', 'VENDIDO', 'RMA'])
                .limit(1);
            if (ventaId) hayVentaActivaQuery = hayVentaActivaQuery.neq('id', ventaId);
            const { data: ventaActiva } = await hayVentaActivaQuery.maybeSingle();

            if (!ventaActiva) {
                const { data, error } = await supabase
                    .from('gps_inventario')
                    .update({ estado: 'STOCK' })
                    .eq('id', gpsId)
                    .select()
                    .single();
                if (error) throw error;
                return { success: true, data };
            }

            const { data, error } = await supabase
                .from('gps_inventario')
                .select()
                .eq('id', gpsId)
                .single();
            if (error) throw error;
            return { success: true, data };
        }

        const { data, error } = await supabase
            .from('gps_inventario')
            .update({ estado: estadoInventario })
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
