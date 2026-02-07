import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useTallerMetrics() {
    const { supabase } = useAuth();
    
    const [metrics, setMetrics] = useState({
        vehiculosEnPlanta: 0,
        ingresosMes: 0,
        alertasStock: 0,
        entregasPendientes: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setIsLoading(true);

                // 1. Contar vehículos activos
                const { count: countActivos } = await supabase
                    .from('taller_ordenes')
                    .select('*', { count: 'exact', head: true })
                    .in('estado', ['recepcion', 'presupuesto', 'en_cola', 'en_proceso', 'control_calidad']);

                // 2. Alertas de Stock
                // CORRECCIÓN AQUÍ: Usamos (i.stock ?? 0) para evitar el error de 'possibly null'
                const { data: inventario } = await supabase
                    .from('taller_inventario_items')
                    .select('stock_actual, stock_minimo');
                
                const countStockBajo = inventario?.filter(i => {
                    const actual = i.stock_actual ?? 0;
                    const minimo = i.stock_minimo ?? 0;
                    return actual <= minimo;
                }).length || 0;

                // 3. Entregas pendientes
                const { count: countEntregas } = await supabase
                    .from('taller_ordenes')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'terminado');

                // 4. Ingresos del mes
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { data: ingresosData } = await supabase
                    .from('taller_transacciones')
                    .select('monto')
                    .eq('tipo', 'ingreso')
                    .gte('fecha_transaccion', firstDay);

                // También protegemos el monto aquí por si acaso
                const totalIngresos = ingresosData?.reduce((acc, curr) => acc + Number(curr.monto ?? 0), 0) || 0;

                setMetrics({
                    vehiculosEnPlanta: countActivos || 0,
                    alertasStock: countStockBajo,
                    entregasPendientes: countEntregas || 0,
                    ingresosMes: totalIngresos
                });

            } catch (error) {
                console.error("Error cargando métricas taller:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [supabase]);

    return { metrics, isLoading };
}