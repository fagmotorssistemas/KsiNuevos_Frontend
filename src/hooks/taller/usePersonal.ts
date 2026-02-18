import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { TallerPersonal, CandidatoProfile } from "@/types/taller";

export function usePersonal() {
    const { supabase } = useAuth();
    const [empleados, setEmpleados] = useState<TallerPersonal[]>([]);
    const [candidatos, setCandidatos] = useState<CandidatoProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: dataPersonal, error } = await supabase
                .from('taller_personal')
                .select(`
                    *,
                    profile:profiles(full_name, phone, role)
                `)
                .order('activo', { ascending: false });

            if (error) throw error;
            
            // Forzamos el tipado a unknown primero para limpiar errores de inferencia de Supabase
            const personalTipado = (dataPersonal || []) as unknown as TallerPersonal[];
            setEmpleados(personalTipado);

            // 2. Obtener usuarios "Candidatos"
            const idsUsados = personalTipado.map((p) => p.profile_id);

            // Preparamos la consulta
            // NOTA: Seleccionamos 'phone' y 'role' ya que 'email' da error de tipo.
            // Usamos 'as any' en el select string para evitar que TS bloquee la compilación si el esquema difiere.
            let query = supabase
                .from('profiles')
                .select('id, full_name, phone' as any); 

            if (idsUsados.length > 0) {
                // Convertimos el array a string explícitamente para satisfacer al tipado de .not()
                const filtroIds = `(${idsUsados.join(',')})`;
                query = query.not('id', 'in', filtroIds);
            }

            const { data: dataCandidatos, error: errorCandidatos } = await query;
            
            if (errorCandidatos) throw errorCandidatos;

            // Mapeamos los resultados para ajustar al tipo CandidatoProfile
            // Si no viene email, usamos un placeholder o el teléfono para que no falle la UI
            const candidatosSeguros = (dataCandidatos || []).map((c: any) => ({
                id: c.id,
                full_name: c.full_name,
                email: c.email || c.phone || 'Sin contacto' // Fallback inteligente
            }));

            setCandidatos(candidatosSeguros as unknown as CandidatoProfile[]);

        } catch (error) {
            console.error("Error cargando personal:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const guardarEmpleado = async (datos: Partial<TallerPersonal>, esNuevo: boolean) => {
        try {
            if (esNuevo) {
                // Validación estricta para TypeScript: profile_id es obligatorio al crear
                if (!datos.profile_id) throw new Error("El ID del perfil de usuario es requerido.");

                const { error } = await supabase
                    .from('taller_personal')
                    .insert([{
                        profile_id: datos.profile_id,
                        cargo: datos.cargo || 'Sin cargo',
                        salario_mensual: datos.salario_mensual || 0,
                        datos_bancarios: datos.datos_bancarios,
                        fecha_ingreso: datos.fecha_ingreso,
                        activo: true
                    }]);
                if (error) throw error;
            } else {
                // Validación estricta para TypeScript: id es obligatorio al actualizar
                if (!datos.id) throw new Error("El ID del empleado es requerido para actualizar.");

                const { error } = await supabase
                    .from('taller_personal')
                    .update({
                        cargo: datos.cargo,
                        salario_mensual: datos.salario_mensual,
                        datos_bancarios: datos.datos_bancarios,
                        fecha_ingreso: datos.fecha_ingreso,
                        activo: datos.activo
                    })
                    .eq('id', datos.id);
                if (error) throw error;
            }

            await fetchData();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const eliminarEmpleado = async (id: string) => {
        try {
            const { error } = await supabase
                .from('taller_personal')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        empleados,
        candidatos,
        isLoading,
        guardarEmpleado,
        eliminarEmpleado,
        refresh: fetchData
    };
}