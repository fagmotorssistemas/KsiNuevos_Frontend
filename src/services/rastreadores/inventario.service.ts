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
    const { data } = await supabase.from('gps_modelos').select('*').order('nombre');
    return data || [];
}

export async function getProveedores(): Promise<ProveedorGPS[]> {
    const { data } = await supabase.from('gps_proveedores').select('*').order('nombre');
    return data || [];
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
        ...p,
        imei: p.imei.trim().toUpperCase(),
        factura_compra: p.factura_compra.trim().toUpperCase()
    }));

    const { data, error } = await supabase.from('gps_inventario').insert(datosLimpios).select();

    if (error) {
        if (error.code === '23505') return { success: false, error: 'Uno o mas IMEIs ya existen.' };
        return { success: false, error: error.message };
    }
    return { success: true, count: data?.length };
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

export async function getInventarioSims(): Promise<InventarioSIM[]> {
    const { data, error } = await supabase
        .from('gps_sims')
        .select('*')
        .eq('estado', 'STOCK')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error obteniendo inventario de SIMs:", error);
        throw new Error(error.message);
    }

    return data as InventarioSIM[];
}

export async function insertarSIM(payload: IngresoSIMPayload): Promise<InventarioSIM> {
    const { data, error } = await supabase
        .from('gps_sims')
        .insert([{
            iccid: payload.iccid,
            numero: payload.numero || null,
            operadora: payload.operadora || null,
            costo_mensual: payload.costo_mensual || null,
            estado: 'STOCK'
        }])
        .select()
        .single();

    if (error) {
        console.error("Error insertando SIM:", error);
        throw new Error(error.message);
    }

    return data as InventarioSIM;
}
