import { createClient } from "@/lib/supabase/client";
import { DashboardInventarioResponse, DetalleVehiculoResponse } from "@/types/inventario.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const inventarioService = {
    // ---------------------------------------------------------
    // TU LÓGICA ORIGINAL (MEJORADA CON MERGE DE SUPABASE)
    // ---------------------------------------------------------
    
    // Método existente para el Dashboard general
    async getDashboard(): Promise<DashboardInventarioResponse> {
        const res = await fetch(`${API_URL}/inventario/dashboard`);
        if (!res.ok) throw new Error('Error fetching inventory dashboard');
        const response = await res.json();
        const oracleData = response.data;

        // --- NUEVO: Traer price y mileage de Supabase ---
        const supabase = createClient();
        const { data: supabaseData, error } = await supabase
            .from('inventoryoracle')
            .select('plate, price, mileage');

        if (error) {
            console.warn("⚠️ No se pudieron traer datos de Supabase:", error);
            return oracleData; // Retornamos solo Oracle si falla Supabase
        }

        // Crear un mapa para búsqueda rápida (key = placa en mayúsculas)
        const supabaseMap = new Map(
            supabaseData?.map(item => [
                item.plate?.toUpperCase(), 
                { price: item.price, mileage: item.mileage }
            ]) || []
        );

        // Fusionar los datos: Oracle + Supabase
        const listadoEnriquecido = oracleData.listado.map((vehiculo: any) => {
            const placaUpper = vehiculo.placa?.toUpperCase();
            const supabaseInfo = supabaseMap.get(placaUpper);
            
            return {
                ...vehiculo,
                price: supabaseInfo?.price || null,
                mileage: supabaseInfo?.mileage || null
            };
        });

        return {
            resumen: oracleData.resumen,
            listado: listadoEnriquecido
        };
    },

    // Método existente: Obtener historial detallado por placa
    async getDetalleVehiculo(placa: string): Promise<DetalleVehiculoResponse> {
        const res = await fetch(`${API_URL}/inventario/detalle/${placa}`);
        if (!res.ok) throw new Error('Error fetching vehicle details');
        const response = await res.json();
        return response.data;
    },

    // ---------------------------------------------------------
    // LO NUEVO: Actualización directa a Supabase (Solo Precio y Kilometraje)
    // ---------------------------------------------------------
    async updateDatosComerciales(placa: string, price: number, mileage: number) {
        const supabase = createClient();

        // CORRECCIÓN: Las columnas en Supabase son 'price' y 'mileage'
        // NO 'precio_venta' ni 'kilometraje_actual'
        
        const { data, error } = await supabase
            .from('inventoryoracle')
            .update({ 
                price: price,
                mileage: mileage,
                updated_at: new Date().toISOString()
            })
            .eq('plate', placa.toUpperCase()); // plate se guarda en MAYÚSCULAS

        if (error) {
            console.error("Error actualizando en Supabase:", error);
            throw error;
        }
        
        return data;
    }
};