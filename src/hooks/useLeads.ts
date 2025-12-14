import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type LeadWithDetails = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: Database['public']['Tables']['interested_cars']['Row'][];
};

export type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export type DateFilter = 'all' | 'today' | '7days' | '15days' | '30days';

// Tipo para el estado de los filtros
export type LeadsFilters = {
    search: string;
    status: string | 'all';
    temperature: string | 'all';
    dateRange: DateFilter;
};

export function useLeads() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // Estado de Datos
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de UI (Orden y Filtros)
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    const [filters, setFilters] = useState<LeadsFilters>({
        search: '',
        status: 'all',
        temperature: 'all',
        dateRange: 'all'
    });

    // Carga de Datos (Trae TODO y filtramos en cliente por velocidad)
    const fetchLeads = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const { data, error } = await supabase
            .from('leads')
            .select('*, interested_cars(*)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando leads:", error);
        } else {
            // @ts-ignore
            setLeads(data || []);
        }
        setIsLoading(false);
    }, [supabase, user]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchLeads();
        }
    }, [isAuthLoading, user, fetchLeads]);

    // --- LÓGICA DE FILTRADO Y ORDENAMIENTO ---
    const processedLeads = useMemo(() => {
        let filtered = [...leads];

        // 1. Filtro por Buscador (Nombre, Teléfono o ID)
        if (filters.search.trim()) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(l => 
                l.name.toLowerCase().includes(query) || 
                l.phone?.includes(query) ||
                l.lead_id_kommo?.toLowerCase().includes(query)
            );
        }

        // 2. Filtro por Estado
        if (filters.status !== 'all') {
            filtered = filtered.filter(l => l.status === filters.status);
        }

        // 3. Filtro por Temperatura
        if (filters.temperature !== 'all') {
            filtered = filtered.filter(l => l.temperature === filters.temperature);
        }

        // 4. Filtro por Fecha
        if (filters.dateRange !== 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            
            filtered = filtered.filter(l => {
                if (!l.created_at) return false;
                const leadDate = new Date(l.created_at).getTime();

                switch (filters.dateRange) {
                    case 'today':
                        return leadDate >= todayStart;
                    case '7days':
                        return leadDate >= (todayStart - (7 * 24 * 60 * 60 * 1000));
                    case '15days':
                        return leadDate >= (todayStart - (15 * 24 * 60 * 60 * 1000));
                    case '30days':
                        return leadDate >= (todayStart - (30 * 24 * 60 * 60 * 1000));
                    default:
                        return true;
                }
            });
        }

        // 5. Ordenamiento
        return filtered.sort((a, b) => {
            const col = sortDescriptor.column as keyof LeadWithDetails;
            const first = a[col];
            const second = b[col];

            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;

            if (typeof first === "string" && typeof second === "string") {
                let cmp = first.localeCompare(second);
                if (sortDescriptor.direction === "descending") cmp *= -1;
                return cmp;
            }

            const aNum = Number(first);
            const bNum = Number(second);
            return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
        });
    }, [leads, filters, sortDescriptor]);

    // Helpers para actualizar filtros individuales
    const updateFilter = (key: keyof LeadsFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return {
        leads: processedLeads,      // Devolvemos la lista YA filtrada
        rawCount: leads.length,     // Total sin filtros (para mostrar "Viendo 5 de 100")
        isLoading: isLoading || isAuthLoading,
        reload: fetchLeads,
        sortDescriptor,
        setSortDescriptor,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', status: 'all', temperature: 'all', dateRange: 'all' })
    };
}