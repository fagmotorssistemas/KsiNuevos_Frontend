import { supabase } from './supabaseClient';
import { getCarteraRastreadores } from './cartera-rastreadores.service';

export async function getKpisFinancieros() {
    try {
        console.log("💰 Calculando Finanzas (coherentes con cartera)...");

        // 1. INVERSION (ACTIVO): Equipos en bodega ('STOCK')
        const { data: stockData, error: stockError } = await supabase
            .from('gps_inventario')
            .select('costo_compra')
            .eq('estado', 'STOCK');

        if (stockError) throw stockError;

        const valorInventario =
            stockData?.reduce((acc, item) => acc + (Number(item.costo_compra) || 0), 0) || 0;

        // 2. BASE COMÚN: CARRERA DE RASTREADORES
        // Usamos exactamente los mismos datos que ve el usuario en CarteraRastreadoresView
        const carteraItems = await getCarteraRastreadores();

        const ventasTotales = carteraItems.reduce(
            (sum, item) => sum + (Number(item.precio_total) || 0),
            0
        );

        const itemsVendidos = carteraItems.length;

        // 3. COSTOS (EGRESOS): tomamos costo de equipos vendidos desde dispositivos_rastreo
        const { data: ventasData, error: ventasError } = await supabase
            .from('dispositivos_rastreo')
            .select('costo_compra');

        if (ventasError) throw ventasError;

        const costosTotales =
            ventasData?.reduce((acc, item) => acc + (Number(item.costo_compra) || 0), 0) || 0;

        // 4. UTILIDAD Y MARGEN
        const utilidadBruta = ventasTotales - costosTotales;
        const margenGlobal = ventasTotales > 0 ? (utilidadBruta / ventasTotales) * 100 : 0;

        console.log(
            `✅ Finanzas: Inv $${valorInventario} | Ventas (cartera) $${ventasTotales} | Costos $${costosTotales}`
        );

        return {
            valorInventario, // Inversión en stock
            ventasTotales,   // Ingresos totales según Cartera
            costosTotales,   // Egresos (costo de equipos vendidos)
            utilidadBruta,   // Ganancia Neta
            margenGlobal,
            itemsVendidos,          // Dispositivos en cartera (mismo universo que la tabla)
            itemsStock: stockData?.length || 0
        };
    } catch (error) {
        console.error("❌ Error calculando KPIs:", error);
        return null;
    }
}
