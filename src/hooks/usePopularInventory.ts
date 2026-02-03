import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

type InventoryCar = Database['public']['Tables']['inventory']['Row'];

// Helper de normalización para asegurar matches aunque haya errores de escritura
const normalizeStr = (str: string) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

export function usePopularInventory(limit: number = 4) {
    const { supabase } = useAuth();
    const [cars, setCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPopularData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. CARGAR INVENTARIO DISPONIBLE
            const { data: inventoryData, error: invError } = await supabase
                .from('inventory')
                .select('*')
                .eq('status', 'disponible'); // Filtro por estatus disponible

            if (invError) throw invError;
            if (!inventoryData) return;

            const masterInventory = inventoryData.map(car => ({
                ...car,
                searchName: normalizeStr(`${car.brand} ${car.model}`)
            }));

            // 2. CARGAR LEADS DESDE LA TABLA CORRECTA (interested_cars)
            // Ya no consultamos 'leads', sino directamente los autos que han interesado
            const { data: interestData, error: interestError } = await supabase
                .from('interested_cars')
                .select('vehicle_uid, brand, model');

            if (interestError) throw interestError;

            // 3. PROCESAR POPULARIDAD
            const leadCounts: Record<string, number> = {};

            interestData?.forEach((item: any) => {
                // Prioridad 1: Match por UID (UUID)
                if (item.vehicle_uid) {
                    leadCounts[item.vehicle_uid] = (leadCounts[item.vehicle_uid] || 0) + 1;
                } 
                // Prioridad 2: Match inteligente por texto si no hay UID
                else {
                    const leadName = normalizeStr(`${item.brand || ''} ${item.model || ''}`);
                    if (leadName.length > 2) {
                        const match = masterInventory.find(inv => 
                            inv.searchName === leadName || inv.searchName.includes(leadName)
                        );
                        if (match) {
                            leadCounts[match.id] = (leadCounts[match.id] || 0) + 1;
                        }
                    }
                }
            });

            // 4. RANKING FINAL
            // Ordenamos el inventario disponible por los votos obtenidos
            const rankedCars = masterInventory
                .sort((a, b) => (leadCounts[b.id] || 0) - (leadCounts[a.id] || 0))
                .slice(0, limit);

            setCars(rankedCars);
        } catch (error) {
            console.error("Error en popular inventory:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, limit]);

    useEffect(() => {
        fetchPopularData();
    }, [fetchPopularData]);

    return { cars, isLoading };
}