import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Database } from '@/types/supabase';
import { scraperService, VehicleWithSeller, VehicleFilters } from '@/services/scraper.service';
import { createClient } from '@/lib/supabase/client';

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
type ScraperCarStatus = Database['public']['Enums']['scraper_car_status'];
type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];
type ScraperVehicle = Database['public']['Tables']['scraper_vehicles']['Row'];

export type FilterOptions = {
  status?: ScraperCarStatus;
  location?: ScraperVehicle['location'];
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

  // ── Estado de filtros de vehículos ───────────────────────────────────────
  // "city" es el nombre interno del filtro, se mapea a "location" al llamar al servicio
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilters & { city: string }>({
    brand: 'all',
    model: 'all',
    motor: 'all',
    year: 'all',
    city: 'all',       // <-- ciudad del anuncio (scraper_vehicles.location)
    dateRange: 'all',
    regionFilter: 'all',
    searchTerm: '',
    sortBy: 'created_at_desc',
    page: 1,
    itemsPerPage: ITEMS_PER_PAGE
  });

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [searchInput, setSearchInput] = useState(vehicleFilters.searchTerm || '');

  useEffect(() => {
    setSearchInput(vehicleFilters.searchTerm || '');
  }, [vehicleFilters.searchTerm]);

  useEffect(() => {
    if (searchInput === vehicleFilters.searchTerm) return;
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => {
      setVehicleFilters(prev => ({ ...prev, searchTerm: searchInput }));
      setCurrentPage(1);
    }, 500);
    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, [searchInput, vehicleFilters.searchTerm]);

  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    models: string[];
    motors: string[];
    years: string[];
    cities: string[];
  }>({
    brands: [],
    models: [],
    motors: [],
    years: [],
    cities: []
  });

  const supabase = useMemo(() => createClient(), []);

  // ── OPCIONES EN CASCADA ──────────────────────────────────────────────────
  const loadCascadingOptions = useCallback(async (
    brand: string,
    model: string,
    motor: string,
    year: string,
    city: string,
    regionFilter: 'all' | 'coast' | 'sierra' = 'all'
  ) => {
    try {
      const options = await scraperService.getCascadingFilterOptions({
        brand: brand !== 'all' ? brand : undefined,
        model: model !== 'all' ? model : undefined,
        motor: motor !== 'all' ? motor : undefined,
        year: year !== 'all' ? year : undefined,
        city: city !== 'all' ? city : undefined,
        regionFilter,
      });
      setFilterOptions(options);
    } catch (error) {
      console.error("Error al cargar opciones en cascada:", error);
    }
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  const loadVehiclesWithFilters = useCallback(async () => {
    setIsLoading(true);
    try {
      const normalizedFilters: VehicleFilters = {
        brand: vehicleFilters.brand !== 'all' ? vehicleFilters.brand : undefined,
        model: vehicleFilters.model !== 'all' ? vehicleFilters.model : undefined,
        motor: vehicleFilters.motor !== 'all' ? vehicleFilters.motor : undefined,
        year: vehicleFilters.year !== 'all' ? vehicleFilters.year : undefined,
        // "city" se mapea a "location" que es el campo real en la DB
        location: vehicleFilters.city !== 'all' ? vehicleFilters.city : undefined,
        dateRange: vehicleFilters.dateRange !== 'all' ? vehicleFilters.dateRange as any : 'all',
        regionFilter: vehicleFilters.regionFilter,
        searchTerm: vehicleFilters.searchTerm,
        sortBy: vehicleFilters.sortBy,
        page: currentPage,
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

  const loadFilterOptions = useCallback(async () => {
    await loadCascadingOptions('all', 'all', 'all', 'all', 'all', 'all');
  }, [loadCascadingOptions]);

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
  // ── ACTUALIZAR FILTROS ───────────────────────────────────────────────────
  const updateFilter = useCallback((key: string, value: any) => {
    if (key === 'searchTerm') {
      setSearchInput(value);
    } else {
      setVehicleFilters(prev => {
        const next = { ...prev, [key]: value };
        if (['brand', 'model', 'motor', 'year', 'city', 'regionFilter'].includes(key)) {
          loadCascadingOptions(
            key === 'brand' ? value : next.brand ?? 'all',
            key === 'model' ? value : next.model ?? 'all',
            key === 'motor' ? value : next.motor ?? 'all',
            key === 'year' ? value : next.year ?? 'all',
            key === 'city' ? value : next.city ?? 'all',
            (key === 'regionFilter' ? value : next.regionFilter ?? 'all') as 'all' | 'coast' | 'sierra'
          );
        }
        return next;
      });
      setCurrentPage(1);
    }
  }, [loadCascadingOptions]);

  const updateBrand = useCallback((brand: string) => {
    setVehicleFilters(prev => {
      loadCascadingOptions(brand, 'all', 'all', 'all', prev.city ?? 'all', prev.regionFilter ?? 'all');
      return { ...prev, brand, model: 'all' };
    });
    setCurrentPage(1);
  }, [loadCascadingOptions]);

  const clearFilters = useCallback(() => {
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    setVehicleFilters({
      brand: 'all', model: 'all', motor: 'all', year: 'all', city: 'all',
      dateRange: 'all', regionFilter: 'all', searchTerm: '',
      sortBy: 'created_at_desc', page: 1, itemsPerPage: ITEMS_PER_PAGE
    });
    setCurrentPage(1);
    loadCascadingOptions('all', 'all', 'all', 'all', 'all', 'all');
  }, [loadCascadingOptions]);

  const applyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadVehiclesWithFilters(), loadSellers(),
      loadPriceStatistics(), loadFilterOptions()
    ]);
  }, [loadVehiclesWithFilters, loadSellers, loadPriceStatistics, loadFilterOptions]);

  const stats = useMemo(() => ({
    total: totalCount,
    nuevos: allVehicles.filter(v => v.condition === 'NEW_ITEM').length,
    usados: allVehicles.filter(v => v.condition === 'USED').length,
    usados_bueno: allVehicles.filter(v => v.condition === 'PC_USED_GOOD').length,
    usados_como_nuevo: allVehicles.filter(v => v.condition === 'PC_USED_LIKE_NEW').length,
    enPatio: allVehicles.filter(v => v.seller?.location === 'patio').length,
    enTaller: allVehicles.filter(v => v.seller?.location === 'taller').length,
    enCliente: allVehicles.filter(v => v.seller?.location === 'cliente').length,
  }), [allVehicles, totalCount]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const pagination = useMemo(() => ({
    currentPage, totalPages, totalItems: totalCount, itemsPerPage: ITEMS_PER_PAGE,
    hasNextPage: currentPage < totalPages, hasPrevPage: currentPage > 1,
    startIndex: totalCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0,
    endIndex: Math.min(currentPage * ITEMS_PER_PAGE, totalCount),
  }), [currentPage, totalPages, totalCount]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      window.scrollTo({ top: 70, behavior: 'auto' });
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => { if (currentPage < totalPages) goToPage(currentPage + 1); }, [currentPage, totalPages, goToPage]);
  const prevPage = useCallback(() => { if (currentPage > 1) goToPage(currentPage - 1); }, [currentPage, goToPage]);

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  useEffect(() => { loadVehiclesWithFilters(); }, [loadVehiclesWithFilters]);
  useEffect(() => { loadSellers(); }, [loadSellers]);
  useEffect(() => { loadPriceStatistics(); }, [loadPriceStatistics]);

  useEffect(() => {
    const vehiclesChannel = supabase
      .channel('scraper_vehicles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scraper_vehicles' }, () => {
        loadVehiclesWithFilters();
        loadCascadingOptions(
          vehicleFilters.brand ?? 'all',
          vehicleFilters.model ?? 'all',
          vehicleFilters.motor ?? 'all',
          vehicleFilters.year ?? 'all',
          vehicleFilters.city ?? 'all',
          vehicleFilters.regionFilter ?? 'all'
        );
      })
      .subscribe();

    const sellersChannel = supabase
      .channel('scraper_sellers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scraper_sellers' }, () => { loadSellers(); })
      .subscribe();

    const statsChannel = supabase
      .channel('scraper_vehicle_price_statistics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scraper_vehicle_price_statistics' }, () => { loadPriceStatistics(); })
      .subscribe();

    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(sellersChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [supabase, loadVehiclesWithFilters, loadSellers, loadPriceStatistics, loadCascadingOptions, vehicleFilters]);

  return {
    vehicles: allVehicles, allVehicles, sellers, isLoading, filters, stats,
    priceStatistics, pagination, goToPage, nextPage, prevPage,
    vehicleFilters: { ...vehicleFilters, searchTerm: searchInput },
    filterOptions, updateFilter, updateBrand, clearFilters,
    getSellerWithVehicles, getPriceStatisticsForVehicle,
    getPriceStatisticsByBrand, getPriceStatisticsByModel, getAllBrandsWithStats,
    applyFilters, refresh: loadVehiclesWithFilters,
    refreshSellers: loadSellers, refreshPriceStatistics: loadPriceStatistics, refreshAll
  };
}