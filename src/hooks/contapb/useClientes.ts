import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClientePB } from "./types";
import { toast } from "sonner";

// --- TIPOS DE FILTROS ---
export type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export type ClientesFilters = {
    search: string;
    calificacion: string | 'all';
};

export function useClientes() {
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

    // 1. CARGA DE DATOS
    const fetchClientes = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('clientespb')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando clientes:", error);
            toast.error("Error al cargar la lista de clientes");
        } else {
            setClientes(data || []);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchClientes();
    }, [fetchClientes]);

    // 2. FUNCIÓN DE ELIMINACIÓN EN CASCADA
    const deleteCliente = async (clienteId: string) => {
        if (!confirm("⚠️ ¿ESTÁ SEGURO?\n\nSe eliminará el cliente y TODOS sus contratos, historial y cobros.\n\nEsta acción es IRREVERSIBLE.")) return;

        setIsLoading(true);
        try {
            // PASO A: Obtener contratos del cliente para borrar sus dependencias
            const { data: contratos } = await supabase
                .from('contratospb')
                .select('id')
                .eq('cliente_id', clienteId);

            if (contratos && contratos.length > 0) {
                const contratoIds = contratos.map(c => c.id);
                
                // PASO B: Borrar todas las cuotas asociadas a esos contratos
                const { error: errorCuotas } = await supabase
                    .from('cuotaspb')
                    .delete()
                    .in('contrato_id', contratoIds);
                
                if (errorCuotas) throw errorCuotas;

                // PASO C: Borrar los contratos
                const { error: errorContratos } = await supabase
                    .from('contratospb')
                    .delete()
                    .in('id', contratoIds);

                if (errorContratos) throw errorContratos;
            }
            
            // PASO D: Finalmente borrar el cliente
            const { error: errorCliente } = await supabase
                .from('clientespb')
                .delete()
                .eq('id', clienteId);
            
            if (errorCliente) throw errorCliente;
            
            toast.success("Cliente y datos relacionados eliminados correctamente");
            
            // Actualizar lista localmente para no recargar todo
            setClientes(prev => prev.filter(c => c.id !== clienteId));

        } catch (error: any) {
            console.error("Error al eliminar:", error);
            toast.error("No se pudo eliminar: " + (error.message || "Error desconocido"));
        } finally {
            setIsLoading(false);
        }
    };

    // 3. LÓGICA DE FILTRADO Y ORDENAMIENTO
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

    // 4. PAGINACIÓN
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
        deleteCliente, // <--- Exportamos la función
        sortBy,
        setSortBy,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', calificacion: 'all' })
    };
}