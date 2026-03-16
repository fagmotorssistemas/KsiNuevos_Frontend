import { supabase } from './supabaseClient';
import { getCarteraRastreadores } from './cartera-rastreadores.service';

/**
 * @param asesorId Si se pasa (vendedor), KPIs/costos solo sobre ventas con asesor_id = asesorId (sin asesor solo admin). Admin: no se pasa, sin filtro, ve todo.
 */
export async function getKpisFinancieros(asesorId?: string | null) {
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
        const carteraItems = await getCarteraRastreadores(asesorId);

        const ventasTotales = carteraItems.reduce(
            (sum, item) => sum + (Number(item.precio_total) || 0),
            0
        );

        const itemsVendidos = carteraItems.length;

        // 3. COSTOS (EGRESOS): ventas_rastreador; vendedor solo sus ventas (asesor_id null solo admin).
        let ventasQuery = supabase
            .from('ventas_rastreador')
            .select('gps_inventario(costo_compra)');
        if (asesorId) {
            ventasQuery = ventasQuery.eq('asesor_id', asesorId);
        }
        const { data: ventasConGps, error: ventasError } = await ventasQuery;

        if (ventasError) throw ventasError;

        const costosTotales =
            (ventasConGps ?? []).reduce((acc: number, item: any) => {
                const gps = Array.isArray(item.gps_inventario) ? item.gps_inventario[0] : item.gps_inventario;
                return acc + (Number(gps?.costo_compra) || 0);
            }, 0) || 0;

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
