// src/hooks/Homeksi/useInventoryData.ts
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- 1. DEFINICIÓN DE TIPOS LOCAL ---
// Definimos 'InventoryCar' aquí mismo, igual que en tu otro hook.
// Usamos 'Pick' para decirle a TS: "De la tabla completa, solo vamos a usar estos campos".
export type InventoryCar = Pick<
  Database["public"]["Tables"]["inventoryoracle"]["Row"],
  | "id"
  | "brand"
  | "model"
  | "year"
  | "color"
  | "type_body"
  | "transmission"
  | "mileage"
  | "price"
  | "img_main_url"
  | "slug"
  | "features"
  | "specs"
  | "fuel_type"
  | "drive_type"
  | "passenger_capacity"
  | "cylinder_count"
  | "version"
  | "plate_short"
  | "aesthetic_condition"
  | "mechanical_condition"
  | "created_at"
  | "registration_place"
  | "previous_owners"
>;

export function useInventoryData() {
    // 2. Usamos el cliente que ya existe en tu Auth (sin crear uno nuevo)
    const { supabase } = useAuth();
    
    const [rawCars, setRawCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 3. Query Selectiva: Debe coincidir con la lista de arriba
    const SELECT_QUERY = `
        id, brand, model, year, color, type_body, transmission, 
        mileage, price, img_main_url, slug, features, specs, 
        fuel_type, drive_type, passenger_capacity, cylinder_count, 
        version, plate_short, aesthetic_condition, mechanical_condition, created_at,
        registration_place, previous_owners
    `;

    const fetchInventory = useCallback(async () => {
        // Validación de seguridad por si useAuth aún no carga
        if (!supabase) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('inventoryoracle')
                .select(SELECT_QUERY)
                .eq('status', 'disponible') // Solo disponibles
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Asignamos los datos. TypeScript aceptará esto porque 'data' coincide con 'InventoryCar'
                setRawCars(data as unknown as InventoryCar[]);
            }
        } catch (err: any) {
            console.error("Error fetching inventory:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (supabase) {
            fetchInventory();
        }
    }, [supabase, fetchInventory]);

    return { rawCars, isLoading, error, refetch: fetchInventory };
}