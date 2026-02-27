import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type InventoryCar = Database['public']['Tables']['inventoryoracle']['Row'];

export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'newest';

export type InventoryFilters = {
    search: string;
    status: string | 'all';
    location: string | 'all';
    minYear: string;
};

export function useInventory() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // Estado de Datos
    const [cars, setCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Paginación y UI
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10); // Puedes cambiar esto a 5, 20, etc.

    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filters, setFilters] = useState<InventoryFilters>({
        search: '',
        status: 'all',
        location: 'all',
        minYear: ''
    });

    // 1. CARGA DE DATOS
    const fetchInventory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const { data, error } = await supabase
            .from('inventoryoracle')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando inventario:", error);
        } else {
            setCars(data || []);
        }
        setIsLoading(false);
    }, [supabase, user]);

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
            const query = filters.search.toLowerCase();
            result = result.filter(car => 
                car.brand.toLowerCase().includes(query) || 
                car.model.toLowerCase().includes(query) ||
                (car.plate && car.plate.toLowerCase().includes(query)) ||
                (car.vin && car.vin.toLowerCase().includes(query)) ||
                // @ts-ignore - plate_short debe agregarse a la tabla inventoryoracle
                (car.plate_short && car.plate_short.toLowerCase().includes(query))
            );
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
    const updateFilter = (key: keyof InventoryFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

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
        sortBy,
        setSortBy,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', status: 'all', location: 'all', minYear: '' })
    };
}