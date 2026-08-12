import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { TallerPersonal } from "@/types/taller";
import { toast } from "sonner";

export function usePersonal() {
    const { supabase } = useAuth();
    const [empleados, setEmpleados] = useState<TallerPersonal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('taller_personal')
                .select('*')
                .order('activo', { ascending: false })
                .order('nombre_completo', { ascending: true });

            if (error) throw error;

            setEmpleados((data || []) as unknown as TallerPersonal[]);
        } catch (error) {
            console.error("Error cargando personal:", error);
            toast.error("No se pudo cargar el personal del taller");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const guardarEmpleado = async (datos: Partial<TallerPersonal>, esNuevo: boolean) => {
        try {
            const nombre = (datos.nombre_completo || "").trim();
            if (!nombre) throw new Error("El nombre es requerido.");

            if (esNuevo) {
                const { error } = await supabase
                    .from('taller_personal')
                    .insert([{
                        nombre_completo: nombre,
                        telefono: datos.telefono?.trim() || null,
                        cargo: datos.cargo || 'Sin cargo',
                        salario_mensual: datos.salario_mensual || 0,
                        datos_bancarios: datos.datos_bancarios || null,
                        fecha_ingreso: datos.fecha_ingreso || null,
                        activo: true,
                        profile_id: null,
                    }]);
                if (error) throw error;
                toast.success("Personal registrado");
            } else {
                if (!datos.id) throw new Error("El ID del empleado es requerido para actualizar.");

                const { error } = await supabase
                    .from('taller_personal')
                    .update({
                        nombre_completo: nombre,
                        telefono: datos.telefono?.trim() || null,
                        cargo: datos.cargo,
                        salario_mensual: datos.salario_mensual,
                        datos_bancarios: datos.datos_bancarios,
                        fecha_ingreso: datos.fecha_ingreso,
                        activo: datos.activo,
                    })
                    .eq('id', datos.id);
                if (error) throw error;
                toast.success("Ficha actualizada");
            }

            await fetchData();
            return { success: true };
        } catch (error: any) {
            toast.error(error.message || "Error al guardar");
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
            toast.success("Ficha eliminada");
            return { success: true };
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar");
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        empleados,
        isLoading,
        guardarEmpleado,
        eliminarEmpleado,
        refresh: fetchData,
    };
}
