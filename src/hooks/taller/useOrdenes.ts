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
                cliente:taller_clientes(*)
            `)
            .neq('estado', 'entregado') // Solo trabajos activos
            .order('fecha_ingreso', { ascending: false });

        if (!error && data) {
            setOrdenes(data as unknown as OrdenTrabajo[]);
        }
        setIsLoading(false);
    }, [supabase]);

    // Cambiar estado (Mover en el Kanban o Modal)
    const actualizarEstado = async (id: string, nuevoEstado: string) => {
        const isEntregado = nuevoEstado === 'entregado';
        const fechaSalida = isEntregado ? new Date().toISOString() : undefined;

        // Optimistic update para UI más rápida
        setOrdenes(prev => prev.map(o => {
            if (o.id === id) {
                return { 
                    ...o, 
                    estado: nuevoEstado as TallerEstadoOrden,
                    // Si pasa a entregado, actualizamos optimísticamente la fecha de salida localmente
                    ...(isEntregado && { fecha_salida_real: fechaSalida })
                } as OrdenTrabajo;
            }
            return o;
        }));
        
        // Payload para la base de datos
        const updatePayload: any = { estado: nuevoEstado as TallerEstadoOrden };
        
        // Si el nuevo estado es entregado, agregamos la fecha de salida real
        if (isEntregado) {
            updatePayload.fecha_salida_real = fechaSalida;
        }

        await supabase
            .from('taller_ordenes')
            .update(updatePayload)
            .eq('id', id);
    };

    // --- FUNCIÓN: Cambiar Estado Contable ---
    const actualizarEstadoContable = async (id: string, nuevoEstado: string) => {
        // Actualización optimista local
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado_contable: nuevoEstado } as OrdenTrabajo : o));
        
        const { error } = await supabase
            .from('taller_ordenes')
            .update({ estado_contable: nuevoEstado })
            .eq('id', id);
            
        return { success: !error, error: error?.message };
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

    // --- FUNCIONES PARA PRESUPUESTO / SERVICIOS ---

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
        const { data } = await supabase
            .from('taller_servicios_catalogo' as any)
            .select('*')
            .order('nombre_servicio');
            
        return (data as unknown as ServicioCatalogo[]) || [];
    };

    const fetchMecanicos = async () => {
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
        actualizarEstadoContable,
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