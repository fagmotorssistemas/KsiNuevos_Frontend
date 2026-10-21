import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { shortQueryError, withQueryRetry } from "@/lib/supabase/query-retry";
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

/** `not_found`: el auto no existe; `load_failed`: falló la consulta (red, Supabase caído) y vale reintentar. */
export type CarDetailErrorKind = 'not_found' | 'load_failed'

class CarNotFoundError extends Error {
  constructor() {
    super('Vehículo no encontrado')
  }
}

export function useCarDetail(param: string) {
  const [car, setCar] = useState<CarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<CarDetailErrorKind | null>(null);

  const fetchCar = useCallback(async () => {
    if (!param) return;

    setIsLoading(true);
    setError(null);
    setErrorKind(null);

    try {
      let decoded = param
      try {
        decoded = decodeURIComponent(param)
      } catch {
        decoded = param
      }
      decoded = decoded.trim()

      if (isVehicleUuid(decoded)) {
        const result = await withQueryRetry(() =>
          supabase.from('inventoryoracle').select('*').eq('id', decoded).maybeSingle()
        )
        if (result.error) throw new Error(shortQueryError(result))
        if (!result.data) throw new CarNotFoundError()
        setCar(result.data)
        return
      }

      const normalized = slugifyVehicleText(decoded)
      if (!normalized) throw new CarNotFoundError()

      const year = extractYearFromVehicleSlug(normalized)
      const brandGuess = normalized.split('-')[0]
      const result = await withQueryRetry(() => {
        let query = supabase.from('inventoryoracle').select('*')
        if (year) {
          query = query.eq('year', year)
        }
        if (brandGuess && !/^\d+$/.test(brandGuess)) {
          query = query.ilike('brand', `${brandGuess}%`)
        }
        return query.limit(200)
      })
      if (result.error) throw new Error(shortQueryError(result))

      const computedMatches = ((result.data ?? []) as CarDetail[]).filter(
        (row) => getVehiclePublicSlug(row) === normalized
      )
      const computedMatch = pickBestMatch(computedMatches)
      if (!computedMatch) throw new CarNotFoundError()

      setCar(computedMatch)
    } catch (err: unknown) {
      const notFound = err instanceof CarNotFoundError
      if (!notFound) console.error("Error al cargar detalle del auto:", err);
      const message = err instanceof Error ? err.message : "No se pudo cargar el auto."
      setError(message);
      setErrorKind(notFound ? 'not_found' : 'load_failed')
      setCar(null)
    } finally {
      setIsLoading(false);
    }
  }, [param]);

  useEffect(() => {
    fetchCar();
  }, [fetchCar]);

  return { car, isLoading, error, errorKind, refetch: fetchCar };
}
