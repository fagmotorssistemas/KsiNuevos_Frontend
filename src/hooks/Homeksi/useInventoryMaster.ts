import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation"; // Importante para leer la URL

// 1. IMPORTS
import { useInventoryData } from "./useInventoryData"; 
import { filterBySearch } from "./modules/filterBySearch";
import { filterByPrice } from "./modules/filterByPrice";
import { filterByCategory } from "./modules/filterByCategory";
import { filterByLocation } from "./modules/filterByLocation";
import { filterBySpecs, type SpecsFilter } from "./modules/filterBySpecs";

// 2. DEFINICIÓN DE TIPOS
export interface InventoryFiltersState {
  searchQuery: string;
  minPrice: number | null;
  maxPrice: number | null;
  categories: string[];
  locations: string[];
  specs: SpecsFilter;
}

const INITIAL_FILTERS: InventoryFiltersState = {
  searchQuery: "",
  minPrice: null,
  maxPrice: null,
  categories: [],
  locations: [],
  specs: {
    minYear: undefined,
    maxYear: undefined,
    minMileage: undefined,
    maxMileage: undefined,
    transmission: [],
    fuelType: [],
    colors: []
  }
};

export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'newest';

export function useInventoryMaster() {
  // 3. OBTENER DATOS Y PARÁMETROS URL
  const { rawCars, isLoading, error, refetch } = useInventoryData();
  const searchParams = useSearchParams(); // <--- ESTO DEBE IR ADENTRO DEL HOOK
  
  // 4. ESTADOS (Con inicialización inteligente)
  const [filters, setFilters] = useState<InventoryFiltersState>(() => {
    // Leemos si hay una categoría en la URL (ej: ?category=SUV)
    const categoryParam = searchParams.get('category');

    // Si existe, iniciamos el estado con esa categoría seleccionada
    if (categoryParam) {
      return {
        ...INITIAL_FILTERS,
        categories: [categoryParam]
      };
    }

    // Si no, iniciamos vacío
    return INITIAL_FILTERS;
  });

  const [sortBy, setSortBy] = useState<SortOption>('newest'); 
  const [page, setPage] = useState(1); 
  const ITEMS_PER_PAGE = 9; 

  // 5. TUBERÍA DE PROCESAMIENTO (PIPELINE)
  const processedCars = useMemo(() => {
    // Si todavía no hay datos, retornamos array vacío
    if (!rawCars) return [];

    let result = rawCars;

    // A. Aplicar Filtros
    result = filterBySearch(result, filters.searchQuery);
    result = filterByPrice(result, filters.minPrice, filters.maxPrice);
    result = filterByCategory(result, filters.categories);
    result = filterByLocation(result, filters.locations);
    result = filterBySpecs(result, filters.specs);

    // B. Aplicar Ordenamiento
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return (a.price || 0) - (b.price || 0);
        case 'price_desc': return (b.price || 0) - (a.price || 0);
        case 'year_desc': return (b.year || 0) - (a.year || 0);
        case 'year_asc': return (a.year || 0) - (b.year || 0);
        case 'newest': 
        default:
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
      }
    });

    return result;
  }, [rawCars, filters, sortBy]);

  // 6. PAGINACIÓN
  const paginatedCars = useMemo(() => {
    return processedCars.slice(0, page * ITEMS_PER_PAGE);
  }, [processedCars, page]);

  // 7. HELPERS PARA ACTUALIZAR ESTADO
  const setFilterValue = useCallback((key: keyof InventoryFiltersState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); 
  }, []);

  const setSpecFilter = useCallback((key: keyof SpecsFilter, value: any) => {
    setFilters((prev) => ({
      ...prev,
      specs: { ...prev.specs, [key]: value }
    }));
    setPage(1); 
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  // 8. RETORNO DE DATOS
  return {
    cars: paginatedCars,           
    totalCount: processedCars.length,
    isLoading,
    error,
    
    // Paginación y Orden
    page,
    setPage,
    sortBy,
    setSortBy,

    // Filtros y Acciones
    filters,
    setFilterValue,
    setSpecFilter,
    clearFilters,
    refetch
  };
}