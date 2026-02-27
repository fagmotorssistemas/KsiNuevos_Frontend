import { Concesionaria, ConcesionariaPayload } from '@/types/rastreadores.types';
import { limpiarTexto } from '@/utils/rastreo-format';
import { supabase } from './supabaseClient';

export async function getConcesionarias(): Promise<Concesionaria[]> {
    const { data, error } = await supabase
        .from('concesionarias')
        .select('*')
        .order('nombre', { ascending: true });
    if (error) {
        console.error('Error listando concesionarias:', error);
        return [];
    }
    return (data ?? []) as Concesionaria[];
}

export async function getConcesionariaByRuc(ruc: string): Promise<Concesionaria | null> {
    const rucLimpio = limpiarTexto(ruc);
    if (!rucLimpio) return null;
    const { data, error } = await supabase
        .from('concesionarias')
        .select('*')
        .eq('ruc', rucLimpio)
        .maybeSingle();
    if (error || !data) return null;
    return data as Concesionaria;
}

/** Crea una concesionaria o devuelve la existente si ya hay una con el mismo RUC */
export async function crearOActualizarConcesionaria(payload: ConcesionariaPayload): Promise<{ data: Concesionaria | null; error: string | null }> {
    const rucLimpio = limpiarTexto(payload.ruc);
    const nombreLimpio = limpiarTexto(payload.nombre);
    if (!rucLimpio || !nombreLimpio) {
        return { data: null, error: 'Nombre y RUC son obligatorios' };
    }

    const { data: existing } = await supabase
        .from('concesionarias')
        .select('*')
        .eq('ruc', rucLimpio)
        .maybeSingle();

    if (existing) {
        const { data: updated, error } = await supabase
            .from('concesionarias')
            .update({
                nombre: nombreLimpio,
                direccion: payload.direccion ? limpiarTexto(payload.direccion) : null,
                telefono: payload.telefono ? limpiarTexto(payload.telefono) : null,
                email: payload.email ? limpiarTexto(payload.email) : null
            })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) return { data: null, error: error.message };
        return { data: updated as Concesionaria, error: null };
    }

    const { data: inserted, error } = await supabase
        .from('concesionarias')
        .insert({
            nombre: nombreLimpio,
            ruc: rucLimpio,
            direccion: payload.direccion ? limpiarTexto(payload.direccion) : null,
            telefono: payload.telefono ? limpiarTexto(payload.telefono) : null,
            email: payload.email ? limpiarTexto(payload.email) : null
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };
    return { data: inserted as Concesionaria, error: null };
}
