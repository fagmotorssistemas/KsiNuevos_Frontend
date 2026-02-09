import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { OrdenTrabajo, ConsumoMaterial, TallerEstadoOrden } from "@/types/taller";

export function useOrdenes() {
    const { supabase, profile } = useAuth();
    const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar todas las órdenes activas
    const fetchOrdenes = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('taller_ordenes')
            .select(`
                *,
                cliente:taller_clientes(nombre_completo, telefono)
            `)
            .neq('estado', 'entregado') // Solo trabajos activos
            .order('fecha_ingreso', { ascending: false });

        if (!error && data) {
            setOrdenes(data as unknown as OrdenTrabajo[]);
        }
        setIsLoading(false);
    }, [supabase]);

    // Cambiar estado (Mover en el Kanban)
    // CORRECCIÓN: Tipamos explícitamente nuevoEstado o lo casteamos al usarlo
    const actualizarEstado = async (id: string, nuevoEstado: string) => {
        // Optimistic update
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado as TallerEstadoOrden } : o));
        
        await supabase
            .from('taller_ordenes')
            .update({ estado: nuevoEstado as TallerEstadoOrden }) // <--- AQUÍ ESTABA EL ERROR: forzamos el tipo
            .eq('id', id);
    };

    // Registrar Consumo
    const registrarConsumo = async (ordenId: string, itemId: string, cantidad: number) => {
        if (!profile?.id) return { success: false, error: "No usuario" };

        const { error } = await supabase
            .from('taller_consumos_materiales')
            .insert([{
                orden_id: ordenId,
                item_id: itemId,
                cantidad: cantidad,
                registrado_por: profile.id
            }]);

        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    // Obtener consumos de una orden específica
    const fetchConsumosOrden = async (ordenId: string) => {
        const { data } = await supabase
            .from('taller_consumos_materiales')
            .select(`
                *,
                item:taller_inventario_items(nombre, unidad_medida, costo_promedio),
                registrado_por:profiles(full_name)
            `)
            .eq('orden_id', ordenId)
            .order('fecha_consumo', { ascending: false });
            
        return (data as unknown as ConsumoMaterial[]) || [];
    };

    useEffect(() => {
        fetchOrdenes();
    }, [fetchOrdenes]);

    return {
        ordenes,
        isLoading,
        actualizarEstado,
        registrarConsumo,
        fetchConsumosOrden,
        refresh: fetchOrdenes
    };
}