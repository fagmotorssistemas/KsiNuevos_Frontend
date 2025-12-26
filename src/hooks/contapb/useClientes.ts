import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClientePB } from "./types";

// --- TIPOS DE FILTROS ---
export type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export type ClientesFilters = {
    search: string;
    calificacion: string | 'all';
};

export function useClientes() {
    // CAMBIO: Ya no sacamos 'user' ni 'isAuthLoading' porque no los validaremos
    const { supabase } = useAuth();

    // Estado de Datos
    const [clientes, setClientes] = useState<ClientePB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Paginación y UI
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(12);

    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filters, setFilters] = useState<ClientesFilters>({
        search: '',
        calificacion: 'all',
    });

    // 1. CARGA DE DATOS (Sin restricción de usuario)
    const fetchClientes = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('clientespb')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando clientes:", error);
        } else {
            setClientes(data || []);
        }
        setIsLoading(false);
    }, [supabase]);

    // Cargar al iniciar (Siempre)
    useEffect(() => {
        fetchClientes();
    }, [fetchClientes]);

    // 2. LÓGICA DE FILTRADO Y ORDENAMIENTO (Memoizada)
    const processedClientes = useMemo(() => {
        let result = [...clientes];

        if (filters.search.trim()) {
            const query = filters.search.toLowerCase();
            result = result.filter(c => 
                c.nombre_completo.toLowerCase().includes(query) || 
                (c.identificacion && c.identificacion.includes(query)) ||
                (c.telefono && c.telefono.includes(query))
            );
        }

        if (filters.calificacion !== 'all') {
            result = result.filter(c => c.calificacion_cliente === filters.calificacion);
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name_asc': return a.nombre_completo.localeCompare(b.nombre_completo);
                case 'name_desc': return b.nombre_completo.localeCompare(a.nombre_completo);
                case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'newest': 
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

        return result;
    }, [clientes, filters, sortBy]);

    // 3. PAGINACIÓN
    const paginatedClientes = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return processedClientes.slice(startIndex, endIndex);
    }, [processedClientes, page, rowsPerPage]);

    useEffect(() => {
        setPage(1);
    }, [filters, sortBy]);

    const updateFilter = (key: keyof ClientesFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return {
        clientes: paginatedClientes,
        totalCount: processedClientes.length,
        page,
        setPage,
        rowsPerPage,
        isLoading,
        reload: fetchClientes,
        sortBy,
        setSortBy,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', calificacion: 'all' })
    };
}