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
    },

    // ---------------------------------------------------------
    // VINCULACIÓN DE RASTREADORES GPS CON VEHÍCULOS
    // ---------------------------------------------------------
    
    /**
     * Obtiene datos completos del vehículo + Rastreador vinculado
     * Une información de inventoryoracle + dispositivos_rastreo
     */
    async getVehiculoConRastreador(placa: string) {
        const supabase = createClient();
        const placaUpper = placa.toUpperCase();

        try {
            // 1. Obtener datos del vehículo desde Supabase
            const { data: vehiculo, error: vehiculoError } = await supabase
                .from('inventoryoracle')
                .select('*')
                .eq('plate', placaUpper)
                .single();

            if (vehiculoError) {
                console.error("Error obteniendo vehículo:", vehiculoError);
                return null;
            }

            // 2. Obtener rastreador vinculado (si existe)
            const { data: rastreador, error: rastreadorError } = await supabase
                .from('dispositivos_rastreo')
                .select('*')
                .eq('nota_venta', vehiculo.oracle_id || '')
                .maybeSingle();

            // 3. Fusionar datos
            return {
                vehiculo,
                rastreador: rastreador || null,
                vinculado: !!rastreador
            };
        } catch (error) {
            console.error("Error en getVehiculoConRastreador:", error);
            return null;
        }
    },

    /**
     * Busca vehículos + rastreadores por placa, marca o modelo
     */
    async buscarVehiculosConRastreador(query: string) {
        const supabase = createClient();
        const queryLower = query.toLowerCase();

        try {
            // 1. Buscar vehículos que coincidan
            const { data: vehiculos, error } = await supabase
                .from('inventoryoracle')
                .select('*')
                .or(`plate.ilike.%${query}%, brand.ilike.%${queryLower}%, model.ilike.%${queryLower}%`)
                .limit(20);

            if (error) {
                console.error("Error buscando vehículos:", error);
                return [];
            }

            // 2. Para cada vehículo, obtener rastreador si existe
            const resultados = await Promise.all(
                (vehiculos || []).map(async (v) => {
                    const { data: rastreador } = await supabase
                        .from('dispositivos_rastreo')
                        .select('*')
                        .eq('nota_venta', v.oracle_id || '')
                        .maybeSingle();

                    return {
                        vehiculo: v,
                        rastreador: rastreador || null,
                        vinculado: !!rastreador
                    };
                })
            );

            return resultados;
        } catch (error) {
            console.error("Error en buscarVehiculosConRastreador:", error);
            return [];
        }
    },

    /**
     * Vincula un rastreador GPS existente a un vehículo
     * Actualiza el campo nota_venta en dispositivos_rastreo
     */
    async vincularRastreadorAVehiculo(placaVehiculo: string, rastreadorId: string, oracleId: string) {
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from('dispositivos_rastreo')
                .update({
                    nota_venta: oracleId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rastreadorId)
                .select()
                .single();

            if (error) {
                console.error("Error vinculando rastreador:", error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error("Error crítico en vincularRastreadorAVehiculo:", error);
            return { success: false, error };
        }
    },

    /**
     * Desvincula un rastreador de un vehículo
     */
    async desvincularRastreador(rastreadorId: string) {
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from('dispositivos_rastreo')
                .update({
                    nota_venta: `SIN-VINCULO-${Date.now()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rastreadorId)
                .select()
                .single();

            if (error) {
                console.error("Error desvinculando rastreador:", error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error("Error crítico en desvincularRastreador:", error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene todos los vehículos con sus rastreadores vinculados
     * Útil para mostrar en dashboard o reportes
     */
    async getVehiculosConRastreadores() {
        const supabase = createClient();

        try {
            // 1. Obtener todos los rastreadores activos
            const { data: rastreadores, error: gpsError } = await supabase
                .from('dispositivos_rastreo')
                .select('*')
                .eq('es_venta_externa', false)
                .order('created_at', { ascending: false });

            if (gpsError) {
                console.error("Error obteniendo rastreadores:", gpsError);
                return [];
            }

            // 2. Agrupar por vehículo (oracle_id)
            const porVehiculo = new Map();

            for (const rastreador of rastreadores || []) {
                const oracleId = rastreador.nota_venta;
                if (!oracleId) continue;

                if (!porVehiculo.has(oracleId)) {
                    porVehiculo.set(oracleId, { rastreadores: [] });
                }
                porVehiculo.get(oracleId).rastreadores.push(rastreador);
            }

            // 3. Obtener datos de vehículos
            const { data: vehiculos } = await supabase
                .from('inventoryoracle')
                .select('*');

            // 4. Fusionar
            const resultados = (vehiculos || []).map(v => ({
                vehiculo: v,
                rastreadores: porVehiculo.get(v.oracle_id)?.rastreadores || [],
                tieneRastreador: porVehiculo.has(v.oracle_id)
            }));

            return resultados;
        } catch (error) {
            console.error("Error en getVehiculosConRastreadores:", error);
            return [];
        }
    }
};