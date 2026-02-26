import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { OrdenTrabajo } from "@/types/taller";

export function useExpedientes() {
    const { supabase } = useAuth();
    const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchExpedientes = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('taller_ordenes')
            .select(`
                *,
                cliente:taller_clientes(nombre_completo, telefono, email, cedula_ruc, direccion),
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

    // --- NUEVA FUNCIÓN: Cambiar Estado Contable ---
    const actualizarEstadoContable = async (id: string, nuevoEstado: string) => {
        // Actualización optimista local
        setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado_contable: nuevoEstado } : o));
        
        const { error } = await supabase
            .from('taller_ordenes')
            .update({ estado_contable: nuevoEstado })
            .eq('id', id);
            
        return { success: !error, error: error?.message };
    };

    const subirArchivo = async (
        ordenId: string, 
        file: File, 
        bucket: 'taller-evidencias' | 'taller-comprobantes' | 'ordenes-trabajo', 
        transaccionId?: string
    ) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${ordenId}/${Date.now()}.${fileExt}`;
            
            // 1. Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);
                
            if (uploadError) throw uploadError;
            
            // 2. Obtener URL Pública
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
                
            const url = publicUrlData.publicUrl;

            // 3. Actualizar la base de datos según el bucket
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
        actualizarEstadoContable // Exportamos la nueva función
    };
}