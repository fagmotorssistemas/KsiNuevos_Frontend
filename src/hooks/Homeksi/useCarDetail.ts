import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import {
  extractYearFromVehicleSlug,
  getVehiclePublicSlug,
  isVehicleUuid,
  slugifyVehicleText,
} from "@/lib/inventario/vehicle-public-slug";

export type CarDetail = Database['public']['Tables']['inventoryoracle']['Row'];

const supabase = createClient();

function pickBestMatch(matches: CarDetail[]): CarDetail | null {
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  return matches.find((car) => car.status === 'disponible') ?? matches[0]
}

export function useCarDetail(param: string) {
  const [car, setCar] = useState<CarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCar = useCallback(async () => {
    if (!param) return;

    setIsLoading(true);
    setError(null);

    try {
      let decoded = param
      try {
        decoded = decodeURIComponent(param)
      } catch {
        decoded = param
      }
      decoded = decoded.trim()

      if (isVehicleUuid(decoded)) {
        const { data, error: queryError } = await supabase
          .from('inventoryoracle')
          .select('*')
          .eq('id', decoded)
          .maybeSingle()

        if (queryError) throw queryError
        if (!data) throw new Error('Vehículo no encontrado')
        setCar(data)
        return
      }

      const normalized = slugifyVehicleText(decoded)
      if (!normalized) throw new Error('Vehículo no encontrado')

      const { data: slugRows, error: slugError } = await supabase
        .from('inventoryoracle')
        .select('*')
        .eq('slug', normalized)
        .limit(10)

      if (slugError) throw slugError

      const slugMatch = pickBestMatch((slugRows ?? []) as CarDetail[])
      if (slugMatch) {
        setCar(slugMatch)
        return
      }

      const year = extractYearFromVehicleSlug(normalized)
      const brandGuess = normalized.split('-')[0]
      let query = supabase.from('inventoryoracle').select('*')
      if (year) {
        query = query.eq('year', year)
      }
      if (brandGuess && !/^\d+$/.test(brandGuess)) {
        query = query.ilike('brand', `${brandGuess}%`)
      }

      const { data: yearRows, error: yearError } = await query.limit(200)
      if (yearError) throw yearError

      const computedMatches = ((yearRows ?? []) as CarDetail[]).filter(
        (row) => getVehiclePublicSlug(row) === normalized
      )
      const computedMatch = pickBestMatch(computedMatches)
      if (!computedMatch) throw new Error('Vehículo no encontrado')

      setCar(computedMatch)
    } catch (err: unknown) {
      console.error("Error al cargar detalle del auto:", err);
      const message = err instanceof Error ? err.message : "No se pudo cargar el auto."
      setError(message);
      setCar(null)
    } finally {
      setIsLoading(false);
    }
  }, [param]);

  useEffect(() => {
    fetchCar();
  }, [fetchCar]);

  return { car, isLoading, error, refetch: fetchCar };
}
