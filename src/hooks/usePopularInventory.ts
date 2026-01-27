import { useState, useEffect } from "react";
import { useVehicleStats } from "@/hooks/useVehicleStats";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

type InventoryCar = Database['public']['Tables']['inventory']['Row'];

export function usePopularInventory(limit: number = 4) {
    const { supabase } = useAuth();
    // 1. Usamos la lógica de leads del mes que ya tienes
    const { inventoryStats, isVehicleLoading } = useVehicleStats('thisMonth', '');
    const [cars, setCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchFullCarData() {
            // Si useVehicleStats aún carga, esperamos
            if (isVehicleLoading) return;

            // 2. Tomamos los primeros 4 IDs (el hook ya los devuelve ordenados por leads)
            const topIds = inventoryStats
                .slice(0, limit)
                .map(stat => stat.vehicle_uid);

            if (topIds.length === 0) {
                setCars([]);
                setIsLoading(false);
                return;
            }

            // 3. Consultamos la tabla inventory para obtener el objeto completo que requiere VehicleCard
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .in('id', topIds);

            if (error) {
                console.error("Error fetching popular cars:", error);
            } else if (data) {
                // Re-ordenamos el resultado de la DB para que coincida con el orden del ranking
                const sortedData = topIds
                    .map(id => data.find(car => car.id === id))
                    .filter(Boolean) as InventoryCar[];
                
                setCars(sortedData);
            }
            setIsLoading(false);
        }

        fetchFullCarData();
    }, [inventoryStats, isVehicleLoading, limit, supabase]);

    return { cars, isLoading: isVehicleLoading || isLoading };
}