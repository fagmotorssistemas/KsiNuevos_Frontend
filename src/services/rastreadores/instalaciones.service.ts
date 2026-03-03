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

const BUCKET_COMPROBANTE_RASTREADOR = 'comprobante_deposito_sky';

export async function subirComprobantePago(file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `rastreador/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(BUCKET_COMPROBANTE_RASTREADOR).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET_COMPROBANTE_RASTREADOR).getPublicUrl(fileName);
    return data.publicUrl;
}

/** Obtiene ventas por nota_venta (fuente: ventas_rastreador, ya no dispositivos_rastreo). */
export async function obtenerPorContrato(notaVenta: string) {
    const { data, error } = await supabase
        .from('ventas_rastreador')
        .select(`
            *,
            cliente_externo:clientes_externos(*),
            gps_inventario(*)
        `)
        .eq('nota_venta', limpiarTexto(notaVenta));
    return error ? [] : data ?? [];
}

/** Crea un registro en gps_inventario (para venta sin ítem de stock) y devuelve el id. */
export async function crearGpsEnInventario(payload: { imei: string; costo_compra: number }): Promise<{ id: string } | null> {
    const imei = limpiarTexto(payload.imei).toUpperCase();
    const { data, error } = await supabase
        .from('gps_inventario')
        .insert({
            imei,
            costo_compra: Number(payload.costo_compra),
            estado: 'VENDIDO'
        })
        .select('id')
        .single();
    if (error || !data) return null;
    return { id: data.id };
}

/** Actualiza tipo_pago y numero_cuotas en ventas_rastreador por gps_id. */
export async function actualizarTipoPagoYPlazo(
    gpsId: string,
    tipo_pago: 'CONTADO' | 'CREDITO',
    numero_cuotas: number | null
) {
    const { error } = await supabase
        .from('ventas_rastreador')
        .update({
            tipo_pago,
            numero_cuotas: numero_cuotas ?? null
        })
        .eq('gps_id', gpsId);
    return { success: !error, error: error?.message };
}
