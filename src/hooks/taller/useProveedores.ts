import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { TallerProveedor } from "@/types/taller";

export function useProveedores() {
    const { supabase } = useAuth();
    const [proveedores, setProveedores] = useState<TallerProveedor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProveedores = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('taller_proveedores')
                .select('*')
                .order('nombre_comercial', { ascending: true });
            
            if (error) throw error;
            setProveedores(data as TallerProveedor[]);
        } catch (error) {
            console.error("Error cargando proveedores:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const crearProveedor = async (proveedor: Omit<TallerProveedor, 'id' | 'created_at'>) => {
        try {
            const { error } = await supabase
                .from('taller_proveedores')
                .insert([proveedor]);
            
            if (error) throw error;
            await fetchProveedores();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const actualizarProveedor = async (id: string, updates: Partial<TallerProveedor>) => {
        try {
            const { error } = await supabase
                .from('taller_proveedores')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchProveedores();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const eliminarProveedor = async (id: string) => {
        try {
            const { error } = await supabase
                .from('taller_proveedores')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProveedores();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    useEffect(() => {
        fetchProveedores();
    }, [supabase]);

    return {
        proveedores,
        isLoading,
        crearProveedor,
        actualizarProveedor,
        eliminarProveedor,
        refresh: fetchProveedores
    };
}