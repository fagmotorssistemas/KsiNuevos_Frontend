import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Traemos el tipo completo de la fila de la base de datos
export type CarDetail = Database['public']['Tables']['inventory']['Row'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
        .from('inventory')
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