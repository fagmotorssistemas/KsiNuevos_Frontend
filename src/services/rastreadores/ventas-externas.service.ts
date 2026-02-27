import {
    ClienteExternoPayload,
    RegistroGPSPayload,
    ConcesionariaPayload,
    ClienteFinalPayload
} from '@/types/rastreadores.types';
import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';
import { registrar, registrarInstalacionDesdeStock } from './instalaciones.service';
import { crearOActualizarConcesionaria } from './concesionarias.service';

export interface OpcionesVentaConcesionaria {
    esConcesionaria: boolean;
    /** Datos de la concesionaria (si es nueva o para actualizar). Si solo se pasa id, se usa la existente. */
    concesionaria?: ConcesionariaPayload & { id?: string };
    /** Id de concesionaria ya seleccionada (si eligió una del listado) */
    concesionariaId?: string | null;
    /** Cliente final: a quién la concesionaria le venderá el equipo */
    clienteFinal?: ClienteFinalPayload | null;
}

export async function registrarVentaExterna(
    cliente: ClienteExternoPayload,
    gpsPayload: RegistroGPSPayload,
    stockId: string | null,
    opciones?: OpcionesVentaConcesionaria
) {
    const esConcesionaria = opciones?.esConcesionaria ?? false;
    let identificacionLimpia: string;
    let clienteData: { id: string };

    if (esConcesionaria && (opciones?.concesionariaId || opciones?.concesionaria)) {
        // Venta a concesionaria: crear/actualizar concesionaria y usar su nombre/ruc como "cliente" en clientes_externos
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
        const clientePayload = {
            identificacion: identificacionLimpia,
            nombre_completo: nombreConcesionaria,
            telefono: limpiarTexto(cliente.telefono) || null,
            email: limpiarTexto(cliente.email) || null,
            placa_vehiculo: limpiarTexto(cliente.placa) || 'N/A',
            marca: limpiarTexto(cliente.marca) || 'N/A',
            modelo: limpiarTexto(cliente.modelo) || '',
            anio: limpiarTexto(cliente.anio) || '',
            color: limpiarTexto(cliente.color) || ''
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

        const ventaPayload: RegistroGPSPayload = {
            ...gpsPayload,
            identificacion_cliente: identificacionLimpia,
            cliente_externo_id: clienteData.id,
            es_venta_externa: true,
            es_concesionaria: true,
            nombre_concesionaria: nombreConcesionaria,
            concesionaria_id: concesionariaId,
            cliente_final_nombre: opciones.clienteFinal?.nombre ? limpiarTexto(opciones.clienteFinal.nombre) : null,
            cliente_final_identificacion: opciones.clienteFinal?.identificacion ? limpiarTexto(opciones.clienteFinal.identificacion) : null,
            cliente_final_telefono: opciones.clienteFinal?.telefono ? limpiarTexto(opciones.clienteFinal.telefono) : null,
            nota_venta: gpsPayload.nota_venta || `EXT-CONC-${Date.now()}`
        };

        if (stockId) return await registrarInstalacionDesdeStock(ventaPayload, stockId);
        return await registrar(ventaPayload);
    }

    // Venta a persona natural (flujo original)
    identificacionLimpia = limpiarTexto(cliente.identificacion);
    const clientePayload = {
        identificacion: identificacionLimpia,
        nombre_completo: limpiarTexto(cliente.nombre),
        telefono: limpiarTexto(cliente.telefono),
        email: limpiarTexto(cliente.email),
        placa_vehiculo: limpiarTexto(cliente.placa),
        marca: limpiarTexto(cliente.marca),
        modelo: limpiarTexto(cliente.modelo),
        anio: limpiarTexto(cliente.anio),
        color: limpiarTexto(cliente.color)
    };

    const { data: existingCliente, error: existingError } = await supabase
        .from('clientes_externos')
        .select('id')
        .eq('identificacion', identificacionLimpia)
        .maybeSingle();

    if (existingError) return { success: false, error: existingError.message };

    const { data: clienteInserted, error: clienteError } = existingCliente?.id
        ? await supabase.from('clientes_externos').update(clientePayload).eq('id', existingCliente.id).select().single()
        : await supabase.from('clientes_externos').insert([clientePayload]).select().single();

    if (clienteError || !clienteInserted) return { success: false, error: clienteError?.message ?? 'Error al guardar cliente externo' };
    clienteData = clienteInserted;

    const ventaPayload: RegistroGPSPayload = {
        ...gpsPayload,
        identificacion_cliente: identificacionLimpia,
        cliente_externo_id: clienteData.id,
        es_venta_externa: true,
        nota_venta: gpsPayload.nota_venta || `EXT-${Date.now()}`
    };

    if (stockId) return await registrarInstalacionDesdeStock(ventaPayload, stockId);
    return await registrar(ventaPayload);
}
