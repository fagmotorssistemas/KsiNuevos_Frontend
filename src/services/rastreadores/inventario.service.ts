import {
    IngresoGPSPayload,
    InventarioGPS,
    ModeloGPS,
    ProveedorGPS,
    InventarioSIM,
    IngresoSIMPayload
} from '@/types/rastreadores.types';
import { supabase } from './supabaseClient';

export async function getModelos(): Promise<ModeloGPS[]> {
    const { data, error } = await supabase.from('gps_modelos').select('*').order('marca');
    if (error) return [];
    return data || [];
}

export async function getProveedores(): Promise<ProveedorGPS[]> {
    const { data } = await supabase.from('gps_proveedores').select('*').order('nombre');
    return data || [];
}

export async function createProveedor(nombre: string): Promise<ProveedorGPS> {
    const { data, error } = await supabase
        .from('gps_proveedores')
        .insert([{ nombre: nombre.trim() }])
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as ProveedorGPS;
}

export async function createModelo(payload: { marca: string; costo_referencia?: number; provedor_id?: string | null }): Promise<ModeloGPS> {
    const { data, error } = await supabase
        .from('gps_modelos')
        .insert([{
            marca: payload.marca.trim() || null,
            costo_referencia: payload.costo_referencia ?? null,
            ...(payload.provedor_id ? { provedor_id: payload.provedor_id } : {})
        }])
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as ModeloGPS;
}

export async function getInventarioStock(): Promise<InventarioGPS[]> {
    const { data, error } = await supabase
        .from('gps_inventario')
        .select(`*, modelo:gps_modelos(*), proveedor:gps_proveedores(*)`)
        .eq('estado', 'STOCK')
        .order('created_at', { ascending: false });

    if (error) return [];

    return (data as any[]).map(item => ({
        ...item,
        modelo: Array.isArray(item.modelo) ? item.modelo[0] : item.modelo,
        proveedor: Array.isArray(item.proveedor) ? item.proveedor[0] : item.proveedor
    })) as InventarioGPS[];
}

export async function ingresarLoteGPS(payloads: IngresoGPSPayload[]) {
    const datosLimpios = payloads.map(p => ({
        imei: p.imei.trim().toUpperCase(),
        modelo_id: p.modelo_id,
        proveedor_id: p.proveedor_id,
        costo_compra: Number(p.costo_compra),
        factura_compra: p.factura_compra.trim().toUpperCase(),
        ...(p.estado_coneccion && { estado_coneccion: p.estado_coneccion })
    }));

    const { data: inserted, error } = await supabase.from('gps_inventario').insert(datosLimpios).select();

    if (error) {
        if (error.code === '23505') return { success: false, error: 'Uno o mas IMEIs ya existen.' };
        return { success: false, error: error.message };
    }

    const firstPayload = payloads[0];
    if (firstPayload?.iccid?.trim() && inserted?.[0]?.id) {
        const iccid = firstPayload.iccid.trim();
        const imsi = firstPayload.imsi?.trim() || null;
        await supabase.from('gps_sims').upsert(
            { iccid, imsi, gps_id: inserted[0].id },
            { onConflict: 'iccid' }
        );
    }

    return { success: true, count: inserted?.length };
}

export type UpdateInventarioGPSPayload = {
    modelo_id?: string | null;
    proveedor_id?: string | null;
    costo_compra?: number;
    factura_compra?: string | null;
    estado_coneccion?: string | null;
};

export async function actualizarItemInventarioGPS(
    id: string,
    payload: UpdateInventarioGPSPayload
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('gps_inventario')
        .update({
            ...(payload.modelo_id !== undefined && { modelo_id: payload.modelo_id }),
            ...(payload.proveedor_id !== undefined && { proveedor_id: payload.proveedor_id }),
            ...(payload.costo_compra !== undefined && { costo_compra: payload.costo_compra }),
            ...(payload.factura_compra !== undefined && { factura_compra: payload.factura_compra?.trim() || null }),
            ...(payload.estado_coneccion !== undefined && { estado_coneccion: payload.estado_coneccion || null })
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function validarStock(imei: string) {
    const { data, error } = await supabase
        .from('gps_inventario')
        .select(`*, modelo:gps_modelos(*), proveedor:gps_proveedores(*)`)
        .eq('imei', imei)
        .single();

    if (error || !data) return { found: false, data: null };
    if (data.estado !== 'STOCK') return { found: true, status: data.estado, data: null };
    return { found: true, status: 'STOCK', data };
}

/** gps_sims solo tiene: id, iccid, created_at, gps_id, imsi (no existe columna estado) */
export async function getInventarioSims(): Promise<InventarioSIM[]> {
    const { data, error } = await supabase
        .from('gps_sims')
        .select('id, iccid, created_at, gps_id, imsi')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error obteniendo inventario de SIMs:", error);
        throw new Error(error.message);
    }

    return (data || []).map((row: { id: string; iccid: string; created_at: string | null; gps_id: string | null; imsi: string | null }) => ({
        id: row.id,
        iccid: row.iccid,
        created_at: row.created_at ?? '',
        gps_id: row.gps_id,
        imsi: row.imsi,
        estado: row.gps_id ? 'ACTIVA' : 'STOCK'
    })) as InventarioSIM[];
}

/** SIM vinculada a un GPS (tabla gps_sims: id, iccid, imsi, gps_id) */
export interface GpsSimRow {
    id: string;
    iccid: string;
    imsi: string | null;
    gps_id: string | null;
}

export async function getSimByGpsId(gpsId: string): Promise<GpsSimRow | null> {
    const { data, error } = await supabase
        .from('gps_sims')
        .select('id, iccid, imsi, gps_id')
        .eq('gps_id', gpsId)
        .maybeSingle();
    if (error || !data) return null;
    return data as GpsSimRow;
}

/** Vincular o actualizar SIM para un GPS. Si iccid vacío, desvincula. */
export async function linkOrUpdateSimForGps(
    gpsId: string,
    iccid: string | null,
    imsi: string | null
): Promise<{ success: boolean; error?: string }> {
    const current = await getSimByGpsId(gpsId);
    if (current) {
        const { error: unlink } = await supabase
            .from('gps_sims')
            .update({ gps_id: null })
            .eq('id', current.id);
        if (unlink) return { success: false, error: unlink.message };
    }
    if (!iccid?.trim()) return { success: true };
    const { error } = await supabase.from('gps_sims').upsert(
        { iccid: iccid.trim(), imsi: imsi?.trim() || null, gps_id: gpsId },
        { onConflict: 'iccid' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
}

/** gps_sims: solo iccid, imsi (gps_id null = disponible) */
export async function insertarSIM(payload: IngresoSIMPayload): Promise<InventarioSIM> {
    const { data, error } = await supabase
        .from('gps_sims')
        .insert([{
            iccid: payload.iccid.trim(),
            imsi: payload.imsi?.trim() || null
        }])
        .select()
        .single();

    if (error) {
        console.error("Error insertando SIM:", error);
        throw new Error(error.message);
    }

    const row = data as { id: string; iccid: string; created_at: string | null; gps_id: string | null; imsi: string | null };
    return {
        id: row.id,
        iccid: row.iccid,
        created_at: row.created_at ?? '',
        gps_id: row.gps_id,
        imsi: row.imsi,
        estado: 'STOCK'
    } as InventarioSIM;
}
