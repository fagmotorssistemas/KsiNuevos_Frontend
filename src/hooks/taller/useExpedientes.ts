import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { OrdenTrabajo } from "@/types/taller";
import { toast } from "sonner";
import { logModuleAudit } from "@/lib/audit/moduleAudit";

export function useExpedientes() {
    const { supabase, profile } = useAuth();
    const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchExpedientes = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('taller_ordenes')
            .select(`
                *,
                cliente:taller_clientes(nombre_completo, telefono, email, cedula_ruc, direccion),
                creado_por:profiles!taller_ordenes_created_by_fkey(full_name),
                transacciones:taller_transacciones(*)
            `)
            .order('fecha_ingreso', { ascending: false });

        if (!error && data) {
            setOrdenes(data as unknown as OrdenTrabajo[]);
        } else if (error) {
            console.error("Error cargando expedientes:", error);
        }
        setIsLoading(false);
    }, [supabase]);

    const actualizarEstadoContable = async (id: string, nuevoEstado: string) => {
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado_contable: nuevoEstado } : o));

        const { error } = await supabase
            .from('taller_ordenes')
            .update({ estado_contable: nuevoEstado })
            .eq('id', id);

        return { success: !error, error: error?.message };
    };

    const actualizarObservacionesIngreso = async (ordenId: string, texto: string) => {
        const value = texto.trim() || null;
        const { error } = await supabase
            .from('taller_ordenes')
            .update({ observaciones_ingreso: value })
            .eq('id', ordenId);

        if (error) {
            toast.error(error.message || "No se pudieron guardar las observaciones");
            return { success: false as const, error: error.message };
        }

        setOrdenes(prev =>
            prev.map(o =>
                o.id === ordenId
                    ? { ...o, observaciones_ingreso: value || undefined }
                    : o
            )
        );

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

        toast.success("Observaciones actualizadas");
        return { success: true as const };
    };

    const actualizarClienteExpediente = async (
        clienteId: string,
        datos: { nombre_completo: string; telefono?: string; email?: string }
    ) => {
        const payload = {
            nombre_completo: datos.nombre_completo.trim(),
            telefono: datos.telefono?.trim() || null,
            email: datos.email?.trim() || null,
            updated_at: new Date().toISOString(),
        };

        if (!payload.nombre_completo) {
            toast.error("El nombre del cliente es requerido");
            return { success: false as const, error: "Nombre requerido" };
        }

        const { error } = await supabase
            .from('taller_clientes')
            .update(payload)
            .eq('id', clienteId);

        if (error) {
            toast.error(error.message || "No se pudo actualizar el cliente");
            return { success: false as const, error: error.message };
        }

        setOrdenes(prev =>
            prev.map(o =>
                o.cliente_id === clienteId
                    ? {
                        ...o,
                        cliente: {
                            ...o.cliente,
                            nombre_completo: payload.nombre_completo,
                            telefono: payload.telefono || undefined,
                            email: payload.email || undefined,
                        },
                    }
                    : o
            )
        );

        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'update',
                entityType: 'taller_clientes',
                entityId: clienteId,
                summary: 'Datos de cliente actualizados desde expediente',
            });
        }

        toast.success("Datos del cliente actualizados");
        return { success: true as const };
    };

    /** Elimina la orden y sus registros dependientes (detalles, consumos, transacciones). */
    const eliminarOrden = async (ordenId: string) => {
        const { error: errDetalles } = await supabase
            .from('taller_detalles_orden')
            .delete()
            .eq('orden_id', ordenId);
        if (errDetalles) {
            toast.error(errDetalles.message || "No se pudieron eliminar los detalles");
            return { success: false as const, error: errDetalles.message };
        }

        const { error: errConsumos } = await supabase
            .from('taller_consumos_materiales')
            .delete()
            .eq('orden_id', ordenId);
        if (errConsumos) {
            toast.error(errConsumos.message || "No se pudieron eliminar los consumos");
            return { success: false as const, error: errConsumos.message };
        }

        const { error: errTx } = await supabase
            .from('taller_transacciones')
            .delete()
            .eq('orden_id', ordenId);
        if (errTx) {
            toast.error(errTx.message || "No se pudieron eliminar las transacciones");
            return { success: false as const, error: errTx.message };
        }

        const { error } = await supabase
            .from('taller_ordenes')
            .delete()
            .eq('id', ordenId);

        if (error) {
            toast.error(error.message || "No se pudo eliminar el expediente");
            return { success: false as const, error: error.message };
        }

        setOrdenes(prev => prev.filter(o => o.id !== ordenId));

        if (profile?.id) {
            void logModuleAudit(supabase, {
                userId: profile.id,
                module: 'taller',
                action: 'delete',
                entityType: 'taller_ordenes',
                entityId: ordenId,
                summary: 'Expediente / orden eliminada',
            });
        }

        toast.success("Expediente eliminado");
        return { success: true as const };
    };

    const subirArchivo = async (
        ordenId: string,
        file: File,
        bucket: 'taller-evidencias' | 'taller-comprobantes' | 'ordenes-trabajo' | 'taller-facturas',
        transaccionId?: string
    ) => {
        try {
            const fileExt = file.name.split('.').pop();
            const storageBucket = bucket === 'taller-facturas' ? 'taller-evidencias' : bucket;
            const filePath = bucket === 'taller-facturas'
                ? `facturas/${ordenId}/${Date.now()}.${fileExt}`
                : `${ordenId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(storageBucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from(storageBucket)
                .getPublicUrl(filePath);

            const url = publicUrlData.publicUrl;

            if (bucket === 'taller-evidencias') {
                const ordenActual = ordenes.find(o => o.id === ordenId);
                const fotosActuales = ordenActual?.fotos_ingreso_urls || [];
                const nuevasFotos = [...fotosActuales, url];

                await supabase.from('taller_ordenes')
                    .update({ fotos_ingreso_urls: nuevasFotos })
                    .eq('id', ordenId);

            } else if (bucket === 'taller-comprobantes' && transaccionId) {
                await supabase.from('taller_transacciones')
                    .update({ comprobante_url: url })
                    .eq('id', transaccionId);

            } else if (bucket === 'ordenes-trabajo') {
                await supabase.from('taller_ordenes')
                    .update({ pdf_url: url })
                    .eq('id', ordenId);
            } else if (bucket === 'taller-facturas') {
                await supabase.from('taller_ordenes')
                    .update({ factura_url: url })
                    .eq('id', ordenId);
            }

            await fetchExpedientes();
            return { success: true, url };

        } catch (error: any) {
            console.error("Error subiendo archivo:", error);
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchExpedientes();
    }, [fetchExpedientes]);

    return {
        ordenes,
        isLoading,
        fetchExpedientes,
        subirArchivo,
        actualizarEstadoContable,
        actualizarObservacionesIngreso,
        actualizarClienteExpediente,
        eliminarOrden,
    };
}
