import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { carMatchesInventorySearch } from "@/lib/inventario/inventorySearch";
import { classifyInventoryBody, type InventoryBodyCategoryFilter } from "@/lib/inventario/inventoryBodyCategory";
import {
    matchesInventoryDateRange,
    type InventoryDateRange,
} from "@/lib/inventario/inventoryDateFilter";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type InventoryCar = Database['public']['Tables']['inventoryoracle']['Row'];

export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'newest';

export type { InventoryDateRange };
export type { InventoryBodyCategoryFilter };

export type InventoryFilters = {
    search: string;
    status: string | 'all';
    location: string | 'all';
    bodyCategory: InventoryBodyCategoryFilter;
    dateRange: InventoryDateRange;
    dateFrom: string;
    dateTo: string;
};

const INITIAL_FILTERS: InventoryFilters = {
    search: '',
    status: 'all',
    location: 'all',
    bodyCategory: 'all',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
};

export function useInventory() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // Estado de Datos
    const [cars, setCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Paginación y UI
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);

    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filters, setFilters] = useState<InventoryFilters>(INITIAL_FILTERS);

    // 1. CARGA DE DATOS
    const fetchInventory = useCallback(async (options?: { silent?: boolean }) => {
        if (!user) return;
        if (!options?.silent) setIsLoading(true);

        const { data, error } = await supabase
            .from('inventoryoracle')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando inventario:", error);
        } else {
            setCars(data || []);
        }
        if (!options?.silent) setIsLoading(false);
    }, [supabase, user]);

    const patchCar = useCallback((id: string, patch: Partial<InventoryCar>) => {
        setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    }, []);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchInventory();
        }
    }, [isAuthLoading, user, fetchInventory]);

    // Lista cruda (sin filtrar) para exportar "todos" o por estado
    const allCars = cars;

    // 2. LÓGICA DE FILTRADO Y ORDENAMIENTO (Memoizada)
    const processedInventory = useMemo(() => {
        let result = [...cars];

        // --- FILTROS ---
        if (filters.search.trim()) {
            result = result.filter((car) => carMatchesInventorySearch(car, filters.search));
        }

        if (filters.status !== 'all') {
            result = result.filter(car => car.status === filters.status);
        }

        if (filters.location !== 'all') {
            result = result.filter(car => car.location === filters.location);
        }

        if (filters.bodyCategory !== 'all') {
            result = result.filter(
                (car) => classifyInventoryBody(car.type_body) === filters.bodyCategory
            );
        }

        if (filters.dateRange !== 'all') {
            result = result.filter((car) =>
                matchesInventoryDateRange(car.created_at, {
                    dateRange: filters.dateRange,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                })
            );
        }

        // --- ORDENAMIENTO ---
        result.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc': return (a.price || 0) - (b.price || 0);
                case 'price_desc': return (b.price || 0) - (a.price || 0);
                case 'year_desc': return b.year - a.year;
                case 'year_asc': return a.year - b.year;
                case 'newest':
                default:
                    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            }
        });

        return result;
    }, [cars, filters, sortBy]);

    // 3. EFECTO DE RESETEO
    // Si cambian los filtros o el orden, regresamos a la página 1
    useEffect(() => {
        setPage(1);
    }, [filters, sortBy]);

    // 4. LÓGICA DE CORTE (PAGINACIÓN)
    const paginatedCars = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return processedInventory.slice(startIndex, endIndex);
    }, [processedInventory, page, rowsPerPage]);

    // Helpers
    const updateFilter = useCallback((
        key: keyof InventoryFilters | Partial<InventoryFilters>,
        value?: InventoryFilters[keyof InventoryFilters]
    ) => {
        setFilters((prev) => {
            if (typeof key === 'object') return { ...prev, ...key };
            return { ...prev, [key]: value };
        });
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(INITIAL_FILTERS);
    }, []);

    return {
        cars: paginatedCars, // Solo devolvemos los 10 de la página actual
        processedInventory, // Lista completa filtrada y ordenada (para exportar/imprimir)
        allCars, // Lista completa sin filtrar (para exportar "todos" o por estado)
        totalCount: processedInventory.length, // El total real para calcular páginas
        page,
        setPage,
        rowsPerPage,
        isLoading: isLoading || isAuthLoading,
        reload: fetchInventory,
        patchCar,
        sortBy,
        setSortBy,
        filters,
        updateFilter,
        resetFilters,
    };
}
