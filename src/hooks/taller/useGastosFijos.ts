import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { GastoFijoConfig } from "@/types/taller";

export function useGastosFijos() {
    const { supabase, profile } = useAuth();
    const [gastos, setGastos] = useState<GastoFijoConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Estadísticas rápidas para el dashboard
    const [resumen, setResumen] = useState({ totalPagar: 0, totalPagado: 0, progreso: 0 });

    const fetchGastos = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Traer la configuración PERMANENTE (Luz, Agua, Arriendo...)
            const { data: configs, error } = await supabase
                .from('taller_gastos_fijos')
                .select('*')
                .eq('activo', true)
                .order('dia_limite_pago', { ascending: true });

            if (error) throw error;

            // 2. Determinar el rango de fechas de ESTE MES ACTUAL
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

            // 3. Buscar pagos realizados SOLO en este mes
            const { data: pagosMes } = await supabase
                .from('taller_gastos_pagos')
                .select('*')
                .gte('fecha_pago', startOfMonth)
                .lte('fecha_pago', endOfMonth);

            // 4. Cruzar información: ¿Qué gasto fijo ya tiene pago este mes?
            let acumuladoPagar = 0;
            let acumuladoPagado = 0;

            const gastosConEstado = configs.map((gasto: any) => {
                const pagoRealizado = pagosMes?.find((p: any) => p.gasto_fijo_id === gasto.id);
                
                // Cálculos para el resumen
                acumuladoPagar += gasto.monto_habitual; // Sumamos lo estimado
                if (pagoRealizado) {
                    acumuladoPagado += pagoRealizado.monto_pagado; // Sumamos lo real pagado
                }

                return {
                    ...gasto,
                    ultimo_pago_mes: pagoRealizado || null // Si hay pago, lo adjuntamos. Si no, es null (Pendiente)
                };
            });

            setGastos(gastosConEstado);
            setResumen({
                totalPagar: acumuladoPagar,
                totalPagado: acumuladoPagado,
                progreso: (configs.length > 0 && pagosMes) ? Math.round((pagosMes.length / configs.length) * 100) : 0
            });

        } catch (error) {
            console.error("Error cargando gastos:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const crearConfiguracionGasto = async (datos: any) => {
        try {
            const { error } = await supabase
                .from('taller_gastos_fijos')
                .insert([{ ...datos, activo: true }]);

            if (error) throw error;
            await fetchGastos();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const registrarPagoGasto = async (
        gastoId: string, 
        monto: number, 
        cuentaId: string, 
        fecha: string, 
        observacion: string, 
        file: File | null
    ) => {
        if (!profile?.id) return { success: false, error: "No autorizado" };

        try {
            let comprobanteUrl = null;

            // A. Subir Comprobante
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `gastos/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('taller-evidencias') // Asegúrate que este bucket exista en Supabase Storage
                    .upload(fileName, file);

                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('taller-evidencias').getPublicUrl(fileName);
                comprobanteUrl = data.publicUrl;
            }

            // B. Guardar en Historial de Pagos
            const { error: pagoError } = await supabase
                .from('taller_gastos_pagos')
                .insert([{
                    gasto_fijo_id: gastoId,
                    monto_pagado: monto,
                    fecha_pago: fecha,
                    comprobante_url: comprobanteUrl,
                    observacion: observacion,
                    registrado_por: profile.id
                }]);
            
            if (pagoError) throw pagoError;

            // C. Descontar el dinero de la cuenta (Transacción)
            const { error: txError } = await supabase
                .from('taller_transacciones')
                .insert([{
                    cuenta_id: cuentaId,
                    tipo: 'gasto_operativo',
                    monto: monto,
                    descripcion: observacion, // Ej: "Pago Luz Febrero 2024"
                    comprobante_url: comprobanteUrl,
                    registrado_por: profile.id
                }]);

            if (txError) throw txError;

            // D. Actualizar Saldo Cuenta (Manual)
            const { data: cuentaData } = await supabase
                .from('taller_cuentas')
                .select('saldo_actual')
                .eq('id', cuentaId)
                .single();
            
            if (cuentaData) {
                // CORRECCION AQUI: Usamos (cuentaData.saldo_actual ?? 0)
                // Esto significa: Si saldo_actual es null, usa 0.
                const saldoActualSeguro = cuentaData.saldo_actual ?? 0;
                
                await supabase
                    .from('taller_cuentas')
                    .update({ saldo_actual: saldoActualSeguro - monto })
                    .eq('id', cuentaId);
            }

            await fetchGastos();
            return { success: true };

        } catch (error: any) {
            console.error("Error pagando gasto:", error);
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchGastos();
    }, [fetchGastos]);

    return {
        gastos,
        resumen,
        isLoading,
        crearConfiguracionGasto,
        registrarPagoGasto,
        refresh: fetchGastos
    };
}