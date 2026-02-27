import { supabase } from './supabaseClient';

export async function getKpisFinancieros() {
    try {
        console.log("💰 Calculando Finanzas...");

        // 1. INVERSION (ACTIVO): Equipos en bodega ('STOCK')
        // Sumamos el costo de compra de lo que NO se ha vendido.
        const { data: stockData, error: stockError } = await supabase
            .from('gps_inventario')
            .select('costo_compra')
            .eq('estado', 'STOCK');

        if (stockError) throw stockError;

        const valorInventario = stockData?.reduce((acc, item) => acc + (Number(item.costo_compra) || 0), 0) || 0;

        // 2. VENTAS (INGRESOS) Y COSTOS (EGRESOS): Equipos instalados
        // Consultamos la tabla de operaciones cerradas
        const { data: ventasData, error: ventasError } = await supabase
            .from('dispositivos_rastreo')
            .select('precio_venta, costo_compra');

        if (ventasError) throw ventasError;

        let ventasTotales = 0; // INGRESOS
        let costosTotales = 0; // EGRESOS (Costo de venta)

        ventasData?.forEach(venta => {
            // Ingreso: Lo que pago el cliente (totalRastreador)
            ventasTotales += Number(venta.precio_venta) || 0;

            // Egreso: Lo que te costo ese equipo especifico
            costosTotales += Number(venta.costo_compra) || 0;
        });

        // 3. UTILIDAD (GANANCIA REAL)
        const utilidadBruta = ventasTotales - costosTotales;

        // 4. MARGEN (%)
        const margenGlobal = ventasTotales > 0 ? (utilidadBruta / ventasTotales) * 100 : 0;

        console.log(`✅ Finanzas: Inv $${valorInventario} | Ventas $${ventasTotales} | Costos $${costosTotales}`);

        return {
            valorInventario, // Inversion
            ventasTotales,   // Ingresos
            costosTotales,   // Egresos
            utilidadBruta,   // Ganancia Neta
            margenGlobal,
            itemsVendidos: ventasData?.length || 0,
            itemsStock: stockData?.length || 0
        };

    } catch (error) {
        console.error("❌ Error calculando KPIs:", error);
        return null;
    }
}
