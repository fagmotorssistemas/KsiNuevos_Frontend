import { RegistroGPSPayload } from '@/types/rastreadores.types';
import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';

export async function subirEvidencias(files: File[]): Promise<string[]> {
    try {
        const uploadPromises = files.map(async (file) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `gps/${Date.now()}_${safeName}`;
            const { error } = await supabase.storage.from('evidencias').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
            return data.publicUrl;
        });
        return await Promise.all(uploadPromises);
    } catch (e) {
        return [];
    }
}

/** Sube un comprobante de pago del rastreador (cheque, transferencia, depósito) y devuelve la URL pública */
export async function subirComprobantePago(file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `comprobantes-pago/rastreador/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('evidencias').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
    return data.publicUrl;
}

export async function obtenerPorContrato(notaVenta: string) {
    const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .select('*')
        .eq('nota_venta', limpiarTexto(notaVenta));
    return error ? [] : data;
}

export async function registrar(payload: RegistroGPSPayload) {
    const cleanPayload = {
        ...payload,
        nota_venta: limpiarTexto(payload.nota_venta),
        identificacion_cliente: limpiarTexto(payload.identificacion_cliente),
        imei: limpiarTexto(payload.imei).toUpperCase()
    };
    const { data, error } = await supabase.from('dispositivos_rastreo').insert([cleanPayload]).select();
    return { success: !error, error: error?.message, data };
}

export async function actualizar(id: number, payload: Partial<RegistroGPSPayload>) {
    const { data, error } = await supabase.from('dispositivos_rastreo').update(payload).eq('id', id).select();
    return { success: !error, error: error?.message, data };
}

/** Actualiza tipo de pago y plazo en el dispositivo (misma lógica que PagoRastreadorExternoModule) para que la cartera clasifique bien contado/crédito. */
export async function actualizarTipoPagoYPlazo(
    dispositivoId: string,
    tipo_pago: 'CONTADO' | 'CREDITO',
    plazo_credito: number | null
) {
    const { error } = await supabase
        .from('dispositivos_rastreo')
        .update({
            tipo_pago,
            plazo_credito: plazo_credito ?? null
        })
        .eq('id', dispositivoId);
    return { success: !error, error: error?.message };
}

export async function registrarInstalacionDesdeStock(payload: RegistroGPSPayload, inventarioId: string) {
    const cleanPayload = {
        ...payload,
        nota_venta: payload.nota_venta ? limpiarTexto(payload.nota_venta) : `SIN-NOTA-${Date.now()}`,
        identificacion_cliente: limpiarTexto(payload.identificacion_cliente),
        imei: limpiarTexto(payload.imei).toUpperCase()
    };

    // 1. Insertar Instalacion
    const { data: installData, error: installError } = await supabase
        .from('dispositivos_rastreo')
        .insert([cleanPayload])
        .select()
        .single();

    if (installError) return { success: false, error: installError.message };

    // 2. Dar de baja en inventario
    const { error: stockError } = await supabase
        .from('gps_inventario')
        .update({
            estado: 'VENDIDO',
            ubicacion: `CLIENTE: ${cleanPayload.identificacion_cliente}`
        })
        .eq('id', inventarioId);

    if (stockError) console.error("Error stock update:", stockError);

    return { success: true, data: installData };
}
