import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Database } from '@/types/supabase';
import { scraperService, VehicleWithSeller, VehicleFilters } from '@/services/scraper.service';
import { createClient } from '@/lib/supabase/client';

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
type ScraperCarStatus = Database['public']['Enums']['scraper_car_status'];
type ScraperCarLocation = Database['public']['Enums']['scraper_car_location'];
type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

export type FilterOptions = {
  status?: ScraperCarStatus;
  location?: ScraperCarLocation;
  sellerId?: string;
  isDealer?: boolean;
};

const ITEMS_PER_PAGE = 20;

export function useScraperData(initialFilters?: FilterOptions) {
  const [allVehicles, setAllVehicles] = useState<VehicleWithSeller[]>([]);
  const [sellers, setSellers] = useState<ScraperSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters || {});
  const [topOpportunities, setTopOpportunities] = useState<VehicleWithSeller[]>([]);
  const [priceStatistics, setPriceStatistics] = useState<PriceStatistics[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // NUEVO: Estados para filtros avanzados
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilters>({
    brand: 'all',
    model: 'all',
    year: 'all',
    city: 'all',
    dateRange: 'all',
    regionFilter: 'all',
    searchTerm: '',
    sortBy: 'created_at_desc',
    page: 1,
    itemsPerPage: ITEMS_PER_PAGE
  });

  // NUEVO: Ref para debounce del searchTerm
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // NUEVO: Opciones de filtros disponibles
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    models: string[];
    years: string[];
    cities: string[];
  }>({
    brands: [],
    models: [],
    years: [],
    cities: []
  });

  const supabase = useMemo(() => createClient(), []);

  // NUEVO: Cargar vehículos con filtros desde BD
  const loadVehiclesWithFilters = useCallback(async () => {
    setIsLoading(true);
    try {
      const normalizedFilters: VehicleFilters = {
        brand: vehicleFilters.brand !== 'all' ? vehicleFilters.brand : undefined,
        model: vehicleFilters.model !== 'all' ? vehicleFilters.model : undefined,
        year: vehicleFilters.year !== 'all' ? vehicleFilters.year : undefined,
        city: vehicleFilters.city !== 'all' ? vehicleFilters.city : undefined,
        dateRange: vehicleFilters.dateRange !== 'all' ? vehicleFilters.dateRange as any : 'all',
        regionFilter: vehicleFilters.regionFilter,
        searchTerm: vehicleFilters.searchTerm,
        sortBy: vehicleFilters.sortBy,
        page: currentPage, // Usar currentPage del estado
        itemsPerPage: ITEMS_PER_PAGE
      };

      const { data, totalCount: count } = await scraperService.getVehiclesWithFilters(normalizedFilters);

      setAllVehicles(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Error al cargar vehículos:", error);
      setAllVehicles([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleFilters, currentPage]);

  // NUEVO: Cargar opciones de filtros
  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await scraperService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error("Error al cargar opciones de filtros:", error);
    }
  }, []);

  // NUEVO: Cargar modelos cuando cambia la marca
  const loadModelsForBrand = useCallback(async (brand: string) => {
    if (brand === 'all') {
      // Recargar todas las opciones
      loadFilterOptions();
      return;
    }

    try {
      const models = await scraperService.getModelsByBrand(brand);
      setFilterOptions(prev => ({
        ...prev,
        models
      }));
    } catch (error) {
      console.error("Error al cargar modelos:", error);
    }
  }, [loadFilterOptions]);

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

  const loadPriceStatistics = useCallback(async () => {
    try {
      const data = await scraperService.getPriceStatistics();
      setPriceStatistics(data);
    } catch (error) {
      console.error("Error al cargar estadísticas de precios:", error);
      setPriceStatistics([]);
    }
  }, []);

  const getSellerWithVehicles = async (sellerId: string) => {
    try {
      return await scraperService.getSellerWithVehicles(sellerId);
    } catch (error) {
      console.error("Error al obtener vendedor con vehículos:", error);
      throw error;
    }
  };

  const getPriceStatisticsForVehicle = async (brand: string, model: string, year?: string) => {
    try {
      return await scraperService.getPriceStatisticsForVehicle(brand, model, year);
    } catch (error) {
      console.error("Error al obtener estadísticas del vehículo:", error);
      return null;
    }
  };

  const getPriceStatisticsByBrand = async (brand: string) => {
    try {
      return await scraperService.getPriceStatisticsByBrand(brand);
    } catch (error) {
      console.error("Error al obtener estadísticas por marca:", error);
      return [];
    }
  };

  const getPriceStatisticsByModel = async (brand: string, model: string) => {
    try {
      return await scraperService.getPriceStatisticsByModel(brand, model);
    } catch (error) {
      console.error("Error al obtener estadísticas por modelo:", error);
      return [];
    }
  };

  const getAllBrandsWithStats = async () => {
    try {
      return await scraperService.getAllBrandPricesWithStats();
    } catch (error) {
      console.error("Error al obtener marcas con estadísticas:", error);
      return [];
    }
  };

  const loadTopOpportunities = useCallback(async () => {
    try {
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
        setTopOpportunities([]);
        return;
      }

      const scored = data.map((v) => {
        let score = 0;

        if (v.price) score += 50000 / v.price;
        if (v.mileage) score += 200000 / (v.mileage + 1);

        if (v.seller?.total_listings !== null && v.seller?.total_listings !== undefined) {
          score += 50 / (v.seller.total_listings + 1);
        }

        const goodWords = [
          "único dueño", "mantenimientos al día", "como nuevo",
          "garaje", "full equipo", "factura", "negociable",
        ];

        const text = `${v.title ?? ""} ${v.description ?? ""}`.toLowerCase();

        goodWords.forEach((word) => {
          if (text.includes(word)) score += 10;
        });

        const badWords = [
          "chocado", "sin papeles", "remato urgente",
          "para repuestos", "motor dañado", "no matriculado",
        ];

        badWords.forEach((word) => {
          if (text.includes(word)) score -= 30;
        });

        return { ...v, deal_score: score };
      });

      const sorted = scored.sort((a, b) => b.deal_score - a.deal_score);

      const uniqueByTitle = Array.from(
        new Map(
          sorted.map((v) => [(v.title ?? "").trim().toLowerCase(), v])
        ).values()
      );

      const top30 = uniqueByTitle.slice(0, 30);
      setTopOpportunities(top30);
    } catch (err) {
      console.error("Error inesperado en oportunidades:", err);
      setTopOpportunities([]);
    }
  }, [supabase]);

  const updateFilter = useCallback((key: string, value: any) => {
    if (key === 'searchTerm') {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
      searchDebounceTimer.current = setTimeout(() => {
        setVehicleFilters(prev => ({
          ...prev,
          [key]: value
        }));
        setCurrentPage(1);
      }, 500);
    } else {
      setVehicleFilters(prev => ({
        ...prev,
        [key]: value
      }));
      setCurrentPage(1);
    }
  }, []);

  const updateBrand = useCallback((brand: string) => {
    setVehicleFilters(prev => ({
      ...prev,
      brand,
      model: 'all'
    }));
    setCurrentPage(1);

    if (brand !== 'all') {
      loadModelsForBrand(brand);
    } else {
      loadFilterOptions();
    }
  }, [loadModelsForBrand, loadFilterOptions]);

  const clearFilters = useCallback(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    setVehicleFilters({
      brand: 'all',
      model: 'all',
      year: 'all',
      city: 'all',
      dateRange: 'all',
      regionFilter: 'all',
      searchTerm: '',
      sortBy: 'created_at_desc',
      page: 1,
      itemsPerPage: ITEMS_PER_PAGE
    });
    setCurrentPage(1);
  }, []);

  const applyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadVehiclesWithFilters(),
      loadSellers(),
      loadTopOpportunities(),
      loadPriceStatistics(),
      loadFilterOptions()
    ]);
  }, [loadVehiclesWithFilters, loadSellers, loadTopOpportunities, loadPriceStatistics, loadFilterOptions]);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      nuevos: allVehicles.filter(v => v.condition === 'NEW_ITEM').length,
      usados: allVehicles.filter(v => v.condition === 'USED').length,
      usados_bueno: allVehicles.filter(v => v.condition === 'PC_USED_GOOD').length,
      usados_como_nuevo: allVehicles.filter(v => v.condition === 'PC_USED_LIKE_NEW').length,
      enPatio: allVehicles.filter(v => v.seller?.location === 'patio').length,
      enTaller: allVehicles.filter(v => v.seller?.location === 'taller').length,
      enCliente: allVehicles.filter(v => v.seller?.location === 'cliente').length,
    };
  }, [allVehicles, totalCount]);

  // Información de paginación
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const pagination = useMemo(() => {
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    const startIndex = totalCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

    return {
      currentPage,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: ITEMS_PER_PAGE,
      hasNextPage,
      hasPrevPage,
      startIndex,
      endIndex,
    };
  }, [currentPage, totalPages, totalCount]);

  // Funciones de navegación
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      window.scrollTo({ top: 70, behavior: 'auto' });
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Cargar datos iniciales
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadVehiclesWithFilters();
  }, [loadVehiclesWithFilters]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  useEffect(() => {
    loadPriceStatistics();
  }, [loadPriceStatistics]);

  useEffect(() => {
    loadTopOpportunities();
  }, [loadTopOpportunities]);

  // Suscripciones en tiempo real
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
          loadVehiclesWithFilters();
          loadTopOpportunities();
          loadFilterOptions();
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

    const statsChannel = supabase
      .channel('scraper_vehicle_price_statistics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraper_vehicle_price_statistics'
        },
        () => {
          loadPriceStatistics();
        }
      )
      .subscribe();

    return () => {
      // Limpiar debounce timer si existe
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }

      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(sellersChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [supabase, loadVehiclesWithFilters, loadSellers, loadPriceStatistics, loadTopOpportunities, loadFilterOptions]);

  return {
    vehicles: allVehicles, // Ya vienen paginados desde la BD
    allVehicles,
    sellers,
    isLoading,
    filters,
    stats,
    topOpportunities,
    priceStatistics,
    pagination,
    goToPage,
    nextPage,
    prevPage,

    // NUEVO: Filtros avanzados
    vehicleFilters,
    filterOptions,
    updateFilter,
    updateBrand,
    clearFilters,

    // Funciones existentes
    refreshTopOpportunities: loadTopOpportunities,
    getSellerWithVehicles,
    getPriceStatisticsForVehicle,
    getPriceStatisticsByBrand,
    getPriceStatisticsByModel,
    getAllBrandsWithStats,
    applyFilters,
    refresh: loadVehiclesWithFilters,
    refreshSellers: loadSellers,
    refreshPriceStatistics: loadPriceStatistics,
    refreshAll
  };
}