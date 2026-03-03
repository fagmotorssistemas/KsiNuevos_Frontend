import {
    ClienteExternoPayload,
    RegistroGPSPayload,
    ConcesionariaPayload,
    ClienteFinalPayload,
    PagoVentaExternaPayload
} from '@/types/rastreadores.types';
import { TipoPagoEnum } from '@/types/rastreadores.types';
import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';
import { crearOActualizarConcesionaria } from './concesionarias.service';

export interface OpcionesVentaConcesionaria {
    esConcesionaria: boolean;
    concesionaria?: ConcesionariaPayload & { id?: string };
    concesionariaId?: string | null;
    clienteFinal?: ClienteFinalPayload | null;
}

/**
 * Registra una venta externa (a tercero o concesionaria).
 * Todo se guarda en ventas_rastreador + clientes_externos + opcional vehiculos + cuotas_rastreador.
 * Ya no usa dispositivos_rastreo.
 */
export async function registrarVentaExterna(
    cliente: ClienteExternoPayload,
    gpsPayload: RegistroGPSPayload,
    stockId: string | null,
    opciones?: OpcionesVentaConcesionaria,
    pagoPayload?: PagoVentaExternaPayload
) {
    const esConcesionaria = opciones?.esConcesionaria ?? false;
    let identificacionLimpia: string;
    let clienteData: { id: string };

    if (esConcesionaria && (opciones?.concesionariaId || opciones?.concesionaria)) {
        let concesionariaId: string | null = opciones.concesionariaId ?? null;
        let nombreConcesionaria = '';
        let rucConcesionaria = '';

        if (opciones.concesionaria && (opciones.concesionaria.nombre || opciones.concesionaria.ruc)) {
            const { data: concesionaria, error: errConcesionaria } = await crearOActualizarConcesionaria(opciones.concesionaria);
            if (errConcesionaria || !concesionaria) return { success: false, error: errConcesionaria ?? 'Error al guardar concesionaria' };
            concesionariaId = concesionaria.id;
            nombreConcesionaria = concesionaria.nombre;
            rucConcesionaria = concesionaria.ruc;
        } else if (concesionariaId) {
            const { data: c } = await supabase.from('concesionarias').select('nombre, ruc').eq('id', concesionariaId).single();
            if (c) {
                nombreConcesionaria = c.nombre;
                rucConcesionaria = c.ruc;
            }
        }
        if (!concesionariaId || !nombreConcesionaria) return { success: false, error: 'Faltan datos de la concesionaria' };

        identificacionLimpia = rucConcesionaria;
        const clientePayload: Record<string, unknown> = {
            identificacion: identificacionLimpia,
            nombre_completo: nombreConcesionaria,
            telefono: limpiarTexto(cliente.telefono) || null,
            email: limpiarTexto(cliente.email) || null,
            direccion: limpiarTexto(cliente.direccion) ?? null
        };

        const { data: existingCliente } = await supabase
            .from('clientes_externos')
            .select('id')
            .eq('identificacion', identificacionLimpia)
            .maybeSingle();

        const { data: clienteInserted, error: clienteError } = existingCliente?.id
            ? await supabase.from('clientes_externos').update(clientePayload).eq('id', existingCliente.id).select().single()
            : await supabase.from('clientes_externos').insert([clientePayload]).select().single();

        if (clienteError || !clienteInserted) return { success: false, error: clienteError?.message ?? 'Error al guardar cliente externo' };
        clienteData = clienteInserted;

        if (pagoPayload && stockId) {
            return await crearVentaRastreadorCompleta({
                gps_id: stockId,
                cliente_id: clienteData.id,
                concesionaria_id: concesionariaId,
                identificacion_cliente: identificacionLimpia,
                nota_venta: gpsPayload.nota_venta || `EXT-CONC-${Date.now()}`,
                pago: pagoPayload,
                gpsPayload,
                actualizarStockId: stockId
            });
        }
        if (stockId) {
            const { error: stockError } = await supabase
                .from('gps_inventario')
                .update({ estado: 'VENDIDO' })
                .eq('id', stockId);
            if (stockError) return { success: false, error: stockError.message };
            return { success: true, data: { gps_id: stockId, cliente_id: clienteData.id } };
        }
        return { success: true, data: { cliente_id: clienteData.id } };
    }

    identificacionLimpia = limpiarTexto(cliente.identificacion);
    const clientePayload: Record<string, unknown> = {
        identificacion: identificacionLimpia,
        nombre_completo: limpiarTexto(cliente.nombre),
        telefono: limpiarTexto(cliente.telefono) || null,
        email: limpiarTexto(cliente.email) || null,
        direccion: limpiarTexto(cliente.direccion) ?? null
    };

    // Si la identificación está vacía, es "000" o muy corta, NO buscar cliente existente:
    // siempre crear uno nuevo para no unir ventas de personas distintas bajo el mismo cliente.
    const identificacionNoConfiable =
        identificacionLimpia.length === 0 ||
        /^0+$/.test(identificacionLimpia) ||
        identificacionLimpia.length < 6;

    let existingCliente: { id: string } | null = null;
    if (!identificacionNoConfiable) {
        const { data, error: existingError } = await supabase
            .from('clientes_externos')
            .select('id')
            .eq('identificacion', identificacionLimpia)
            .maybeSingle();
        if (existingError) return { success: false, error: existingError.message };
        existingCliente = data;
    }

    const { data: clienteInserted, error: clienteError } = existingCliente?.id
        ? await supabase.from('clientes_externos').update(clientePayload).eq('id', existingCliente.id).select().single()
        : await supabase.from('clientes_externos').insert([clientePayload]).select().single();

    if (clienteError || !clienteInserted) return { success: false, error: clienteError?.message ?? 'Error al guardar cliente externo' };
    clienteData = clienteInserted;

    if (pagoPayload) {
        let gps_id: string;
        if (stockId) {
            gps_id = stockId;
        } else {
            const { data: gpsInserted, error: gpsErr } = await supabase
                .from('gps_inventario')
                .insert({
                    imei: limpiarTexto(gpsPayload.imei).toUpperCase(),
                    costo_compra: Number(gpsPayload.costo_compra),
                    estado: 'VENDIDO'
                })
                .select('id')
                .single();
            if (gpsErr || !gpsInserted) return { success: false, error: gpsErr?.message ?? 'Error al crear registro de GPS' };
            gps_id = gpsInserted.id;
        }

        const vehiculo_id = await crearVehiculoSiAplica(clienteData.id, cliente);

        return await crearVentaRastreadorCompleta({
            gps_id,
            cliente_id: clienteData.id,
            vehiculo_id: vehiculo_id ?? undefined,
            identificacion_cliente: identificacionLimpia,
            nota_venta: gpsPayload.nota_venta || `EXT-${Date.now()}`,
            pago: pagoPayload,
            gpsPayload,
            actualizarStockId: stockId || undefined
        });
    }

    if (stockId) {
        const { error: stockError } = await supabase
            .from('gps_inventario')
            .update({ estado: 'VENDIDO' })
            .eq('id', stockId);
        if (stockError) return { success: false, error: stockError.message };
    }
    return { success: true, data: { gps_id: stockId ?? null, cliente_id: clienteData.id } };
}

async function crearVehiculoSiAplica(cliente_id: string, cliente: ClienteExternoPayload): Promise<string | null> {
    const placa = limpiarTexto(cliente.placa);
    if (!placa || placa === 'N/A') return null;
    const { data: veh, error } = await supabase
        .from('vehiculos')
        .insert({
            cliente_id,
            placa,
            marca: limpiarTexto(cliente.marca) || null,
            modelo: limpiarTexto(cliente.modelo) || null,
            anio: limpiarTexto(cliente.anio) || null,
            color: limpiarTexto(cliente.color) || null
        })
        .select('id')
        .single();
    if (error || !veh) return null;
    return veh.id;
}

interface CrearVentaCompletaParams {
    gps_id: string;
    cliente_id: string;
    vehiculo_id?: string;
    concesionaria_id?: string | null;
    identificacion_cliente: string;
    nota_venta: string;
    pago: PagoVentaExternaPayload;
    gpsPayload: RegistroGPSPayload;
    actualizarStockId?: string;
}

async function crearVentaRastreadorCompleta(params: CrearVentaCompletaParams) {
    const { gps_id, cliente_id, vehiculo_id, concesionaria_id, nota_venta, pago, gpsPayload, actualizarStockId } = params;

    const { data: ventaData, error: ventaError } = await supabase
        .from('ventas_rastreador')
        .insert({
            gps_id,
            cliente_id,
            vehiculo_id: vehiculo_id ?? null,
            concesionaria_id: concesionaria_id ?? null,
            entorno: 'EXTERNO',
            tipo_pago: pago.tipo_pago,
            precio_total: Number(pago.precio_total),
            abono_inicial: pago.abono_inicial != null ? Number(pago.abono_inicial) : 0,
            total_financiado: pago.total_financiado != null ? Number(pago.total_financiado) : null,
            numero_cuotas: pago.numero_cuotas ?? null,
            metodo_pago: pago.metodo_pago != null ? String(pago.metodo_pago) : null,
            url_comprobante_pago: pago.url_comprobante_pago ?? null,
            fecha_entrega: (pago.fecha_entrega && pago.fecha_entrega !== '') ? pago.fecha_entrega : null,
            asesor_id: (pago.asesor_id && pago.asesor_id !== '') ? pago.asesor_id : null,
            observacion: (pago.observacion && pago.observacion.trim() !== '') ? pago.observacion.trim() : null,
            nota_venta,
            es_venta_externa: true,
            instalador_id: (pago.instalador_id && pago.instalador_id !== '') ? pago.instalador_id : null,
            costo_instalacion: pago.costo_instalacion ?? null
        })
        .select('id')
        .single();

    if (ventaError || !ventaData) return { success: false, error: ventaError?.message ?? 'Error al registrar venta' };

    if (pago.tipo_pago === TipoPagoEnum.CREDITO && pago.numero_cuotas && pago.numero_cuotas > 0 && pago.total_financiado != null) {
        const valorCuota = pago.total_financiado / pago.numero_cuotas;
        const hoy = new Date();
        const cuotasInsert = Array.from({ length: pago.numero_cuotas }, (_, i) => {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() + i + 1, hoy.getDate());
            return {
                venta_id: ventaData.id,
                numero_cuota: i + 1,
                valor: Math.round(valorCuota * 100) / 100,
                fecha_vencimiento: d.toISOString().slice(0, 10),
                estado: 'PENDIENTE' as const
            };
        });
        const { error: cuotasError } = await supabase.from('cuotas_rastreador').insert(cuotasInsert);
        if (cuotasError) return { success: false, error: cuotasError.message };
    }

    if (actualizarStockId) {
        const { error: stockErr } = await supabase
            .from('gps_inventario')
            .update({ estado: 'VENDIDO' })
            .eq('id', actualizarStockId);
        if (stockErr) return { success: false, error: stockErr.message };
    }

    return { success: true, data: { id: ventaData.id, gps_id, cliente_id } };
}
