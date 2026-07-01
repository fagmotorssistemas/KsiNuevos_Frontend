import { createClient } from '@/lib/supabase/client';
import { Instalador, NuevoInstaladorPayload } from "@/types/rastreadores.types";

const supabase = createClient();

export const instaladoresService = {
    getInstaladores: async (): Promise<Instalador[]> => {
        const { data, error } = await supabase
            .from('gps_instaladores')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) {
            console.error("Error obteniendo instaladores:", error);
            throw new Error(error.message);
        }
        return data as Instalador[];
    },

    crearInstalador: async (payload: NuevoInstaladorPayload): Promise<Instalador> => {
        const { data, error } = await supabase
            .from('gps_instaladores')
            .insert([{
                nombre: payload.nombre,
                telefono: payload.telefono || null,
                valor_por_instalacion: payload.valor_por_instalacion || 0,
                activo: true
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creando instalador:", error);
            throw new Error(error.message);
        }
        return data as Instalador;
    },
    
    // Opcional: Un método rápido para activar/desactivar
    toggleActivo: async (id: string, estadoActual: boolean): Promise<void> => {
        const { error } = await supabase
            .from('gps_instaladores')
            .update({ activo: !estadoActual })
            .eq('id', id);
            
        if (error) throw new Error(error.message);
    }
};