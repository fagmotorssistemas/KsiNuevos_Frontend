import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { OrdenTrabajo, ConsumoMaterial, TallerEstadoOrden, DetalleOrden, ServicioCatalogo, PresupuestoHistorialRow, ObservacionIngresoHistorialRow } from "@/types/taller";
import { logModuleAudit } from "@/lib/audit/moduleAudit";

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
                cliente:taller_clientes(*),
                creado_por:profiles!taller_ordenes_created_by_fkey(full_name)
            `)
            .neq('estado', 'entregado') // Solo trabajos activos
            .order('fecha_ingreso', { ascending: false });

        if (!error && data) {
            setOrdenes(data as unknown as OrdenTrabajo[]);
        }
        setIsLoading(false);
    }, [supabase]);

    /** Obtener una orden por ID (incluye entregados). Útil desde Cuentas por Cobrar. */
    const fetchOrdenById = useCallback(async (ordenId: string): Promise<OrdenTrabajo | null> => {
        const { data, error } = await supabase
            .from('taller_ordenes')
            .select(`
                *,
                cliente:taller_clientes(*),
                creado_por:profiles!taller_ordenes_created_by_fkey(full_name)
            `)
            .eq('id', ordenId)
            .single();
        if (error || !data) return null;
        return data as unknown as OrdenTrabajo;
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

        const { error } = await supabase
            .from('taller_ordenes')
            .update(updatePayload)
            .eq('id', id);
        if (!error && profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_ordenes',
                entityId: id,
                summary: `Estado orden → ${nuevoEstado}`,
            });
        }
    };

    // --- FUNCIÓN: Cambiar Estado Contable ---
    const actualizarEstadoContable = async (id: string, nuevoEstado: string) => {
        // Actualización optimista local
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado_contable: nuevoEstado } as OrdenTrabajo : o));
        
        const { error } = await supabase
            .from('taller_ordenes')
            .update({ estado_contable: nuevoEstado })
            .eq('id', id);

        if (!error && profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_ordenes',
                entityId: id,
                summary: `Estado contable → ${nuevoEstado}`,
            });
        }

        return { success: !error, error: error?.message };
    };

    /** Actualizar observaciones de ingreso de una orden */
    const fetchHistorialObservacionesIngreso = async (ordenId: string): Promise<ObservacionIngresoHistorialRow[]> => {
        const { data, error } = await (supabase as any)
            .from('taller_observaciones_ingreso_historial')
            .select(`
                *,
                created_by_profile:profiles!taller_obs_ingreso_historial_created_by_fkey(full_name)
            `)
            .eq('orden_id', ordenId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[taller_observaciones_ingreso_historial]', error.message);
            return [];
        }
        return (data as ObservacionIngresoHistorialRow[]) || [];
    };

    const actualizarObservacionesIngreso = async (ordenId: string, texto: string): Promise<{ success: boolean; error?: string }> => {
        const trimmed = texto.trim();
        if (!trimmed) {
            return { success: false, error: "Escribe una observación antes de guardar." };
        }

        const { error } = await supabase
            .from('taller_ordenes')
            .update({ observaciones_ingreso: trimmed })
            .eq('id', ordenId);
        if (error) return { success: false, error: error.message };

        const { data: last } = await (supabase as any)
            .from('taller_observaciones_ingreso_historial')
            .select('texto')
            .eq('orden_id', ordenId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!last || (last.texto || "").trim() !== trimmed) {
            const { error: histError } = await (supabase as any)
                .from('taller_observaciones_ingreso_historial')
                .insert({
                    orden_id: ordenId,
                    created_by: profile?.id ?? null,
                    texto: trimmed,
                    es_inicial: false,
                });
            if (histError) console.error('[taller_observaciones_ingreso_historial]', histError.message);
        }

        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_ordenes',
                entityId: ordenId,
                summary: 'Observaciones de ingreso actualizadas',
            });
        }
        setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, observaciones_ingreso: trimmed } as OrdenTrabajo : o));
        return { success: true };
    };

    const eliminarHistorialObservacionesIngreso = async (
        id: string
    ): Promise<{ success: boolean; error?: string; textoRestaurado?: string | null }> => {
        const role = (profile?.role || "").toLowerCase().trim();
        if (role !== "admin") {
            return { success: false, error: "Solo un administrador puede eliminar el historial." };
        }

        const { data: row, error: fetchError } = await (supabase as any)
            .from("taller_observaciones_ingreso_historial")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !row) {
            return { success: false, error: fetchError?.message || "Entrada de historial no encontrada." };
        }

        if (row.es_inicial) {
            return { success: false, error: "La observación inicial no se puede eliminar." };
        }

        const { data: siblings } = await (supabase as any)
            .from("taller_observaciones_ingreso_historial")
            .select("id, texto, created_at, es_inicial")
            .eq("orden_id", row.orden_id)
            .order("created_at", { ascending: false });

        const lista = (siblings || []) as { id: string; texto: string; created_at: string; es_inicial?: boolean }[];
        const esLaMasReciente = lista[0]?.id === id;
        const anterior = lista.find((s) => s.id !== id && s.created_at < row.created_at);

        const { data: ordenRow } = await (supabase as any)
            .from("taller_ordenes")
            .select("observaciones_ingreso_inicial")
            .eq("id", row.orden_id)
            .single();

        const textoInicial = ((ordenRow as { observaciones_ingreso_inicial?: string | null } | null)?.observaciones_ingreso_inicial || "").trim() || null;
        const textoAnterior = anterior?.texto?.trim() || textoInicial;

        if (esLaMasReciente) {
            const { error: revertError } = await supabase
                .from("taller_ordenes")
                .update({ observaciones_ingreso: textoAnterior })
                .eq("id", row.orden_id);
            if (revertError) return { success: false, error: revertError.message };
            setOrdenes(prev => prev.map(o =>
                o.id === row.orden_id
                    ? { ...o, observaciones_ingreso: textoAnterior || undefined } as OrdenTrabajo
                    : o
            ));
        }

        const { error } = await (supabase as any)
            .from("taller_observaciones_ingreso_historial")
            .delete()
            .eq("id", id);
        if (error) return { success: false, error: error.message };

        return {
            success: true,
            textoRestaurado: esLaMasReciente ? textoAnterior : undefined,
        };
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
        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'create',
                entityType: 'taller_consumos_materiales',
                entityId: ordenId,
                summary: `Consumo material (ítem ${itemId}) cantidad ${cantidad}`,
                metadata: { item_id: itemId, cantidad },
            });
        }
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
            .select('*')
            .eq('orden_id', ordenId)
            .order('created_at', { ascending: true });
            
        return (data as unknown as DetalleOrden[]) || [];
    };

    const sumDetalles = (rows: DetalleOrden[]) =>
        rows.reduce((acc, d) => acc + Number(d.precio_unitario || 0) * Number(d.cantidad || 1), 0);

    const insertHistorialPresupuesto = async (row: {
        orden_id: string;
        action: 'agregar' | 'editar';
        descripcion?: string | null;
        precio_unitario?: number | null;
        cantidad?: number | null;
        descripcion_anterior?: string | null;
        precio_unitario_anterior?: number | null;
        motivo?: string | null;
        total_antes: number;
        total_despues: number;
    }) => {
        const { error } = await (supabase as any).from('taller_presupuesto_historial').insert({
            ...row,
            changed_by: profile?.id ?? null,
        });
        if (error) console.error('[taller_presupuesto_historial]', error.message);
    };

    const fetchHistorialPresupuesto = async (ordenId: string): Promise<PresupuestoHistorialRow[]> => {
        const { data, error } = await (supabase as any)
            .from('taller_presupuesto_historial')
            .select(`
                *,
                changed_by_profile:profiles!taller_presupuesto_historial_changed_by_fkey(full_name)
            `)
            .eq('orden_id', ordenId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[taller_presupuesto_historial]', error.message);
            return [];
        }
        return (data as PresupuestoHistorialRow[]) || [];
    };

    const revertirPrecioDesdeHistorial = async (row: PresupuestoHistorialRow): Promise<{ success: boolean; error?: string }> => {
        if (row.action !== "editar") {
            return { success: true };
        }

        const detalles = await fetchDetallesOrden(row.orden_id);
        const mismos = detalles.filter((d) => d.descripcion === row.descripcion);
        if (mismos.length === 0) {
            return { success: false, error: "No se encontró el ítem para revertir el precio." };
        }

        const precioDespues = Number(row.precio_unitario);
        const detalle =
            mismos.find((d) => Number(d.precio_unitario) === precioDespues) ?? mismos[0];

        const precioAnterior =
            row.precio_unitario_anterior != null
                ? Number(row.precio_unitario_anterior)
                : Number(detalle.precio_unitario_inicial ?? 0);

        const { error } = await supabase
            .from("taller_detalles_orden")
            .update({ precio_unitario: precioAnterior })
            .eq("id", detalle.id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const eliminarHistorialPresupuesto = async (id: string): Promise<{ success: boolean; error?: string }> => {
        const role = (profile?.role || "").toLowerCase().trim();
        if (role !== "admin") {
            return { success: false, error: "Solo un administrador puede eliminar el historial." };
        }

        const { data: row, error: fetchError } = await (supabase as any)
            .from("taller_presupuesto_historial")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !row) {
            return { success: false, error: fetchError?.message || "Entrada de historial no encontrada." };
        }

        if (row.action !== "editar") {
            return { success: false, error: "El alta inicial del ítem no se puede eliminar." };
        }

        const revert = await revertirPrecioDesdeHistorial(row as PresupuestoHistorialRow);
        if (!revert.success) return revert;

        const { error } = await (supabase as any)
            .from("taller_presupuesto_historial")
            .delete()
            .eq("id", id);
        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const agregarDetalle = async (detalle: { orden_id: string, descripcion: string, precio_unitario: number, cantidad: number }) => {
        const actuales = await fetchDetallesOrden(detalle.orden_id);
        const totalAntes = sumDetalles(actuales);

        const { error } = await (supabase as any)
            .from('taller_detalles_orden')
            .insert([{
                ...detalle,
                precio_unitario_inicial: detalle.precio_unitario,
            }]);
            
        if (error) return { success: false, error: error.message };

        const totalDespues = totalAntes + detalle.precio_unitario * detalle.cantidad;
        await insertHistorialPresupuesto({
            orden_id: detalle.orden_id,
            action: 'agregar',
            descripcion: detalle.descripcion,
            precio_unitario: detalle.precio_unitario,
            cantidad: detalle.cantidad,
            total_antes: totalAntes,
            total_despues: totalDespues,
        });

        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'create',
                entityType: 'taller_detalles_orden',
                entityId: detalle.orden_id,
                summary: 'Línea de detalle / presupuesto agregada',
                metadata: { descripcion: detalle.descripcion, precio_unitario: detalle.precio_unitario, cantidad: detalle.cantidad },
            });
        }
        return { success: true };
    };

    const actualizarDetalle = async (
        id: string,
        cambios: { precio_unitario: number; motivo: string }
    ) => {
        const motivo = cambios.motivo.trim();
        if (!motivo) {
            return { success: false, error: 'El motivo es obligatorio' };
        }

        const { data: actual, error: fetchError } = await supabase
            .from('taller_detalles_orden')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !actual) {
            return { success: false, error: fetchError?.message || 'Ítem no encontrado' };
        }

        const ordenId = actual.orden_id as string;
        const actuales = await fetchDetallesOrden(ordenId);
        const totalAntes = sumDetalles(actuales);
        const cantidad = Number(actual.cantidad || 1);
        const totalDespues =
            totalAntes -
            Number(actual.precio_unitario || 0) * cantidad +
            cambios.precio_unitario * cantidad;

        const { error } = await supabase
            .from('taller_detalles_orden')
            .update({
                precio_unitario: cambios.precio_unitario,
            })
            .eq('id', id);

        if (error) return { success: false, error: error.message };

        await insertHistorialPresupuesto({
            orden_id: ordenId,
            action: 'editar',
            descripcion: actual.descripcion,
            precio_unitario: cambios.precio_unitario,
            cantidad,
            descripcion_anterior: actual.descripcion,
            precio_unitario_anterior: Number(actual.precio_unitario || 0),
            motivo,
            total_antes: totalAntes,
            total_despues: totalDespues,
        });

        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_detalles_orden',
                entityId: id,
                summary: 'Línea de presupuesto editada',
                metadata: { precio_unitario: cambios.precio_unitario, motivo },
            });
        }
        return { success: true };
    };

    const eliminarDetalle = async (id: string) => {
        const { error } = await supabase
            .from('taller_detalles_orden')
            .delete()
            .eq('id', id);

        if (!error && profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'delete',
                entityType: 'taller_detalles_orden',
                entityId: id,
                summary: 'Línea de detalle eliminada',
            });
        }

        return { success: !error };
    };

    const fetchServiciosCatalogo = async () => {
        const { data } = await supabase
            .from('taller_servicios_catalogo' as any)
            .select('*')
            .order('nombre_servicio');
            
        return (data as unknown as ServicioCatalogo[]) || [];
    };

    const BUCKET_EVIDENCIA_SALIDA = 'taller-evidencias-salida';

    const uploadFotoSalida = async (ordenId: string, file: File): Promise<{ url: string } | { error: string }> => {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${ordenId}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_EVIDENCIA_SALIDA)
            .upload(fileName, file, { upsert: false });
        if (uploadError) return { error: uploadError.message };
        const { data } = supabase.storage.from(BUCKET_EVIDENCIA_SALIDA).getPublicUrl(fileName);
        return { url: data.publicUrl };
    };

    const actualizarFotosSalida = async (ordenId: string, urls: string[]): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase
            .from('taller_ordenes')
            .update({ fotos_salida_urls: urls })
            .eq('id', ordenId);
        if (error) return { success: false, error: error.message };
        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_ordenes',
                entityId: ordenId,
                summary: `Fotos salida actualizadas (${urls.length} archivo(s))`,
            });
        }
        setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, fotos_salida_urls: urls } as OrdenTrabajo : o));
        return { success: true };
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
        actualizarObservacionesIngreso,
        fetchHistorialObservacionesIngreso,
        eliminarHistorialObservacionesIngreso,
        registrarConsumo,
        fetchConsumosOrden,
        fetchDetallesOrden,
        fetchOrdenById,
        agregarDetalle,
        actualizarDetalle,
        fetchHistorialPresupuesto,
        eliminarHistorialPresupuesto,
        eliminarDetalle,
        fetchServiciosCatalogo,
        fetchMecanicos,
        uploadFotoSalida,
        actualizarFotosSalida,
        refresh: fetchOrdenes
    };
}