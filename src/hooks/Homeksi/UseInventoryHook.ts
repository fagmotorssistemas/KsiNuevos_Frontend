import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js"; // <--- CAMBIO AQUÍ
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type InventoryCar = Database['public']['Tables']['inventory']['Row'];
export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'newest';

export type InventoryFilters = {
    search: string;
    status: string | 'all';
    location: string | 'all';
    minYear: string;
};

// --- INICIALIZACIÓN DEL CLIENTE ---
// Usamos las variables de entorno directamente. 
// Asegúrate de que estas variables existan en tu .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function useInventoryPublic() {
    
    // Estado de Datos
    const [cars, setCars] = useState<InventoryCar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Paginación
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(12); 

    const [sortBy, setSortBy] = useState<SortOption>('newest');
    
    // Configuración inicial de filtros
    const [filters, setFilters] = useState<InventoryFilters>({
        search: '',
        status: 'disponible', 
        location: 'all',
        minYear: ''
    });

    // 1. CARGA DE DATOS 
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando inventario público:", error);
        } else {
            setCars(data || []);
        }
        setIsLoading(false);
    }, []); // Ya no dependemos de 'supabase' en el array de dependencias porque está definido afuera

    // Ejecutar al montar el componente
    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // 2. LÓGICA DE FILTRADO Y ORDENAMIENTO
    const processedInventory = useMemo(() => {
        let result = [...cars];

        // --- FILTROS ---
        if (filters.search.trim()) {
            const query = filters.search.toLowerCase();
            result = result.filter(car => 
                car.brand.toLowerCase().includes(query) || 
                car.model.toLowerCase().includes(query) ||
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
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                case 'year_desc': return b.year - a.year;
                case 'year_asc': return a.year - b.year;
                case 'newest': 
                default:
                    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            }
        });

        return result;
    }, [cars, filters, sortBy]);

    // 3. RESETEO DE PÁGINA
    useEffect(() => {
        setPage(1);
    }, [filters, sortBy]);

    // 4. PAGINACIÓN
    const paginatedCars = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return processedInventory.slice(startIndex, endIndex);
    }, [processedInventory, page, rowsPerPage]);

    const updateFilter = (key: keyof InventoryFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return {
        cars: paginatedCars,
        totalCount: processedInventory.length,
        page,
        setPage,
        isLoading,
        sortBy,
        setSortBy,
        filters,
        updateFilter,
    };
}