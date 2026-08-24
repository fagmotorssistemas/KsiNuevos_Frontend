import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { carMatchesInventorySearch } from "@/lib/inventario/inventorySearch";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type InventoryCar = Database['public']['Tables']['inventoryoracle']['Row'];

export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'newest';

export type InventoryDateRange = 'all' | 'today' | '7days' | '15days' | 'thisMonth' | 'custom';

export type InventoryFilters = {
    search: string;
    status: string | 'all';
    location: string | 'all';
    minYear: string;
    dateRange: InventoryDateRange;
    dateFrom: string;
    dateTo: string;
};

const INITIAL_FILTERS: InventoryFilters = {
    search: '',
    status: 'all',
    location: 'all',
    minYear: '',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
};

const ECUADOR_TZ = 'America/Guayaquil';

function toEcuadorYmd(value: Date | string): string {
    return new Date(value).toLocaleDateString('en-CA', { timeZone: ECUADOR_TZ });
}

function addCalendarDays(ymd: string, days: number): string {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function matchesCreatedAt(createdAt: string | null, filters: InventoryFilters): boolean {
    if (filters.dateRange === 'all') return true;
    if (!createdAt) return false;

    const createdYmd = toEcuadorYmd(createdAt);
    const todayYmd = toEcuadorYmd(new Date());

    if (filters.dateRange === 'custom') {
        if (!filters.dateFrom || !filters.dateTo) return true;
        return createdYmd >= filters.dateFrom && createdYmd <= filters.dateTo;
    }

    switch (filters.dateRange) {
        case 'today':
            return createdYmd === todayYmd;
        case '7days':
            return createdYmd >= addCalendarDays(todayYmd, -6) && createdYmd <= todayYmd;
        case '15days':
            return createdYmd >= addCalendarDays(todayYmd, -14) && createdYmd <= todayYmd;
        case 'thisMonth':
            return createdYmd.startsWith(todayYmd.slice(0, 7));
        default:
            return true;
    }
}

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

        if (filters.minYear) {
            const year = parseInt(filters.minYear);
            if (!isNaN(year)) {
                result = result.filter(car => car.year >= year);
            }
        }

        if (filters.dateRange !== 'all') {
            result = result.filter((car) => matchesCreatedAt(car.created_at, filters));
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
