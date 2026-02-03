import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database } from '@/types/supabase';
import { scraperService, VehicleWithSeller } from '@/services/scraper.service';
import { createClient } from '@/lib/supabase/client';

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
type ScraperCarStatus = Database['public']['Enums']['scraper_car_status'];
type ScraperCarLocation = Database['public']['Enums']['scraper_car_location'];

export type FilterOptions = {
  status?: ScraperCarStatus;
  location?: ScraperCarLocation;
  sellerId?: string;
  isDealer?: boolean;
};

export function useScraperData(initialFilters?: FilterOptions) {
  const [vehicles, setVehicles] = useState<VehicleWithSeller[]>([]);
  const [sellers, setSellers] = useState<ScraperSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters || {});
  const [topOpportunities, setTopOpportunities] = useState<VehicleWithSeller[]>([]);

  const supabase = useMemo(() => createClient(), []);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: VehicleWithSeller[];

      if (filters.status) {
        data = await scraperService.getVehiclesByStatus(filters.status);
      } else if (filters.location) {
        data = await scraperService.getVehiclesByLocation(filters.location);
      } else {
        data = await scraperService.getVehicles();
      }

      // Filtros adicionales en cliente
      if (filters.sellerId) {
        data = data.filter(v => v.seller_id === filters.sellerId);
      }

      if (filters.isDealer !== undefined) {
        data = data.filter(v => v.seller?.is_dealer === filters.isDealer);
      }

      setVehicles(data);
    } catch (error) {
      console.error("Error al cargar vehículos:", error);
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadSellers = useCallback(async () => {
    try {
      const data = filters.isDealer
        ? await scraperService.getDealers()
        : await scraperService.getSellers();
      setSellers(data);
    } catch (error) {
      console.error("Error al cargar vendedores:", error);
      setSellers([]);
    }
  }, [filters.isDealer]);

  const updateVehicleStatus = async (id: string, status: ScraperCarStatus) => {
    try {
      await scraperService.updateVehicleStatus(id, status);
      await loadVehicles();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      throw error;
    }
  };

  const updateVehicleLocation = async (id: string, location: ScraperCarLocation) => {
    try {
      await scraperService.updateVehicleLocation(id, location);
      await loadVehicles();
    } catch (error) {
      console.error("Error al actualizar ubicación:", error);
      throw error;
    }
  };

  const updateTags = async (id: string, tags: string[]) => {
    try {
      await scraperService.updateVehicleTags(id, tags);
      await loadVehicles();
    } catch (error) {
      console.error("Error al actualizar tags:", error);
      throw error;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await scraperService.deleteVehicle(id);
      await loadVehicles();
    } catch (error) {
      console.error("Error al eliminar vehículo:", error);
      throw error;
    }
  };

  const getSellerWithVehicles = async (sellerId: string) => {
    try {
      return await scraperService.getSellerWithVehicles(sellerId);
    } catch (error) {
      console.error("Error al obtener vendedor con vehículos:", error);
      throw error;
    }
  };
const loadTopOpportunities = useCallback(async () => {
  try {
    // =============================
    // 1. Traer candidatos desde Supabase
    // =============================
    const { data, error } = await supabase
      .from("scraper_vehicles")
      .select(`
        *,
        seller:scraper_sellers(*)
      `)
      .not("price", "is", null)
      .not("mileage", "is", null)
      .gte("price", 1000)
      .lte("price", 50000)
      .lte("mileage", 250000)
      .eq("seller.is_dealer", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error cargando oportunidades:", error);
      setTopOpportunities([]);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No se encontraron vehículos candidatos.");
      setTopOpportunities([]);
      return;
    }

    // =============================
    // 2. Ranking inteligente (Deal Score)
    // =============================
    const scored = data.map((v) => {
      let score = 0;

      // 1. Precio bajo (mejor score)
      if (v.price) score += 50000 / v.price;

      // 2. Kilometraje bajo
      if (v.mileage) score += 200000 / (v.mileage + 1);

      // 3. Particular con pocas publicaciones
      if (v.seller?.total_listings !== null && v.seller?.total_listings !== undefined) {
        score += 50 / (v.seller.total_listings + 1);
      }

      // 4. Bonus por palabras positivas
      const goodWords = [
        "único dueño",
        "mantenimientos al día",
        "como nuevo",
        "garaje",
        "full equipo",
        "factura",
        "negociable",
      ];

      // Texto completo para análisis
      const text = `${v.title ?? ""} ${v.description ?? ""}`.toLowerCase();

      goodWords.forEach((word) => {
        if (text.includes(word)) score += 10;
      });

      // 5. Penalización por palabras sospechosas
      const badWords = [
        "chocado",
        "sin papeles",
        "remato urgente",
        "para repuestos",
        "motor dañado",
        "no matriculado",
      ];

      badWords.forEach((word) => {
        if (text.includes(word)) score -= 30;
      });

      return {
        ...v,
        deal_score: score,
      };
    });

    // =============================
    // 3. Ordenar por score (mejores primero)
    // =============================
    const sorted = scored.sort((a, b) => b.deal_score - a.deal_score);

    // =============================
    // 4. Eliminar duplicados por TITLE
    //    (nos quedamos con el mejor score)
    // =============================
    const uniqueByTitle = Array.from(
      new Map(
        sorted.map((v) => [
          (v.title ?? "").trim().toLowerCase(), // clave normalizada
          v, // vehículo
        ])
      ).values()
    );

    // =============================
    // 5. Top 30 finales
    // =============================
    const top30 = uniqueByTitle.slice(0, 30);

    console.log("🔥 Top Opportunities:", top30);

    // Guardar en estado
    setTopOpportunities(top30 as VehicleWithSeller[]);
  } catch (err) {
    console.error("Error inesperado en oportunidades:", err);
    setTopOpportunities([]);
  }
}, [supabase]);



  const applyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadVehicles(), loadSellers()]);
  }, [loadVehicles, loadSellers]);

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      nuevos: vehicles.filter(v => v.status === 'NUEVO').length,
      descartados: vehicles.filter(v => v.status === 'DESCARTADO').length,
      vendidos: vehicles.filter(v => v.status === 'VENDIDO').length,
      enMantenimiento: vehicles.filter(v => v.status === 'MANTENIMIENTO').length,
      enPatio: vehicles.filter(v => v.location === 'patio').length,
      enTaller: vehicles.filter(v => v.location === 'taller').length,
      enCliente: vehicles.filter(v => v.location === 'cliente').length,
    };
  }, [vehicles]);



  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  useEffect(() => {
    const vehiclesChannel = supabase
      .channel('scraper_vehicles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraper_vehicles'
        },
        () => {
          loadVehicles();
          loadTopOpportunities();
        }
      )
      .subscribe();

    const sellersChannel = supabase
      .channel('scraper_sellers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraper_sellers'
        },
        () => {
          loadSellers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(sellersChannel);
    };
  }, [supabase, loadVehicles, loadSellers]);

  useEffect(() => {
    loadTopOpportunities();
  }, [loadTopOpportunities]);

  return {
    vehicles,
    sellers,
    isLoading,
    filters,
    stats,
    topOpportunities,
    refreshTopOpportunities: loadTopOpportunities,
    updateVehicleStatus,
    updateVehicleLocation,
    updateTags,
    deleteVehicle,
    getSellerWithVehicles,
    applyFilters,
    clearFilters,
    refresh: loadVehicles,
    refreshSellers: loadSellers,
    refreshAll
  };
}