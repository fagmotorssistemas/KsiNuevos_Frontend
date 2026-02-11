import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { OrdenTrabajo, ConsumoMaterial, TallerEstadoOrden, DetalleOrden, ServicioCatalogo } from "@/types/taller";

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
    const actualizarEstado = async (id: string, nuevoEstado: string) => {
        // Optimistic update
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado as TallerEstadoOrden } : o));
        
        await supabase
            .from('taller_ordenes')
            .update({ estado: nuevoEstado as TallerEstadoOrden })
            .eq('id', id);
    };

    // Registrar Consumo (Materiales)
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

    // --- NUEVAS FUNCIONES PARA PRESUPUESTO / SERVICIOS ---

    const fetchDetallesOrden = async (ordenId: string) => {
        const { data } = await supabase
            .from('taller_detalles_orden')
            .select(`
                *,
                mecanico:profiles(full_name)
            `)
            .eq('orden_id', ordenId)
            .order('created_at', { ascending: true });
            
        return (data as unknown as DetalleOrden[]) || [];
    };

    const agregarDetalle = async (detalle: { orden_id: string, descripcion: string, precio_unitario: number, cantidad: number, mecanico_asignado_id?: string }) => {
        const { error } = await supabase
            .from('taller_detalles_orden')
            .insert([detalle]);
            
        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const eliminarDetalle = async (id: string) => {
        const { error } = await supabase
            .from('taller_detalles_orden')
            .delete()
            .eq('id', id);
            
        return { success: !error };
    };

    const fetchServiciosCatalogo = async () => {
        // CORRECCIÓN AQUÍ: Usamos 'as any' para evitar el error de TypeScript
        // ya que la tabla es nueva y los tipos locales no la tienen aún.
        const { data } = await supabase
            .from('taller_servicios_catalogo' as any)
            .select('*')
            .order('nombre_servicio');
            
        return (data as unknown as ServicioCatalogo[]) || [];
    };

    const fetchMecanicos = async () => {
        // Asumiendo que usamos la tabla profiles. Podrías filtrar por rol si tuvieras uno.
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name');
            
        return data || [];
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
        fetchDetallesOrden,
        agregarDetalle,
        eliminarDetalle,
        fetchServiciosCatalogo,
        fetchMecanicos,
        refresh: fetchOrdenes
    };
}