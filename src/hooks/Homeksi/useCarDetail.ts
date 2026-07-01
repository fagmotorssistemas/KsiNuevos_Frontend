import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

// Traemos el tipo completo de la fila de la base de datos
export type CarDetail = Database['public']['Tables']['inventoryoracle']['Row'];

const supabase = createClient();

export function useCarDetail(id: string) {
  const [car, setCar] = useState<CarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCar = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Solicitamos un auto específico por su ID
      const { data, error } = await supabase
        .from('inventoryoracle') // Asegúrate de usar la tabla correcta
        .select('*')
        .eq('id', id)
        .single(); // .single() es clave: devuelve un objeto, no un array

      if (error) throw error;

      setCar(data);
    } catch (err: any) {
      console.error("Error al cargar detalle del auto:", err);
      setError(err.message || "No se pudo cargar el auto.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCar();
  }, [fetchCar]);

  return { car, isLoading, error, refetch: fetchCar };
}