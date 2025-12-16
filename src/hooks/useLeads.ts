import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
export type LeadWithDetails = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: Database['public']['Tables']['interested_cars']['Row'][];
    profiles: { full_name: string } | null;
};

export type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export type DateFilter = 'all' | 'today' | '7days' | '15days' | '30days';

export type LeadsFilters = {
    search: string;
    status: string | 'all';
    temperature: string | 'all';
    dateRange: DateFilter;
    assignedTo: string | 'all';
};

export function useLeads() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // Estado de Datos
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [sellers, setSellers] = useState<{ id: string; full_name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Paginación y UI
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10); 

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    const [filters, setFilters] = useState<LeadsFilters>({
        search: '',
        status: 'all',
        temperature: 'all',
        dateRange: 'all',
        assignedTo: 'all'
    });

    // Carga de Leads
    const fetchLeads = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const { data, error } = await supabase
            .from('leads')
            .select('*, interested_cars(*), profiles:assigned_to(full_name)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando leads:", error);
        } else {
            // @ts-ignore
            setLeads(data || []);
        }
        setIsLoading(false);
    }, [supabase, user]);

    // Carga de Vendedores
    const fetchSellers = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .order('full_name');
            
        if (data) {
            // @ts-ignore
            setSellers(data);
        }
    }, [supabase, user]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchLeads();
            fetchSellers();
        }
    }, [isAuthLoading, user, fetchLeads, fetchSellers]);

    // --- LÓGICA DE FILTRADO ---
    const processedLeads = useMemo(() => {
        let filtered = [...leads];

        // Filtro Buscador
        if (filters.search.trim()) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(l =>
                l.name.toLowerCase().includes(query) ||
                l.phone?.includes(query) ||
                (l.lead_id_kommo && l.lead_id_kommo.toString().toLowerCase().includes(query)) ||
                (l.profiles?.full_name && l.profiles.full_name.toLowerCase().includes(query)) ||
                // MODIFICADO: Nueva lógica para buscar por vehículos de interés (Marca o Modelo)
                (l.interested_cars && l.interested_cars.some(car => 
                    car.brand.toLowerCase().includes(query) || 
                    car.model.toLowerCase().includes(query)
                ))
            );
        }

        // Filtro Estado
        if (filters.status !== 'all') {
            filtered = filtered.filter(l => l.status === filters.status);
        }

        // Filtro Temperatura
        if (filters.temperature !== 'all') {
            filtered = filtered.filter(l => l.temperature === filters.temperature);
        }

        // Filtro Responsable
        if (filters.assignedTo !== 'all') {
            filtered = filtered.filter(l => l.assigned_to === filters.assignedTo);
        }

        // Filtro Fecha
        if (filters.dateRange !== 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            filtered = filtered.filter(l => {
                if (!l.created_at) return false;
                const leadDate = new Date(l.created_at).getTime();

                switch (filters.dateRange) {
                    case 'today': return leadDate >= todayStart;
                    case '7days': return leadDate >= (todayStart - (7 * 24 * 60 * 60 * 1000));
                    case '15days': return leadDate >= (todayStart - (15 * 24 * 60 * 60 * 1000));
                    case '30days': return leadDate >= (todayStart - (30 * 24 * 60 * 60 * 1000));
                    default: return true;
                }
            });
        }

        // Ordenamiento
        return filtered.sort((a, b) => {
            const col = sortDescriptor.column as keyof LeadWithDetails;
            
            if (col === 'assigned_to') {
                const first = a.profiles?.full_name || '';
                const second = b.profiles?.full_name || '';
                let cmp = first.localeCompare(second);
                return sortDescriptor.direction === "descending" ? cmp * -1 : cmp;
            }

            const first = a[col];
            const second = b[col];

            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;

            if (typeof first === "string" && typeof second === "string") {
                let cmp = first.localeCompare(second);
                return sortDescriptor.direction === "descending" ? cmp * -1 : cmp;
            }

            const aNum = Number(first);
            const bNum = Number(second);
            return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
        });
    }, [leads, filters, sortDescriptor]);

    // --- NUEVO CÁLCULO: Leads Respondidos ---
    // Contamos cuántos de los leads filtrados tienen algo en 'resume' (no es null ni vacío)
    const respondedCount = useMemo(() => {
        return processedLeads.filter(l => l.resume !== null && l.resume.trim() !== '').length;
    }, [processedLeads]);

    // Resetear página al filtrar
    useEffect(() => {
        setPage(1);
    }, [filters, sortDescriptor]);

    const paginatedLeads = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return processedLeads.slice(startIndex, startIndex + rowsPerPage);
    }, [processedLeads, page, rowsPerPage]);

    const updateFilter = (key: keyof LeadsFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return {
        leads: paginatedLeads,
        totalCount: processedLeads.length,
        rawCount: leads.length,
        respondedCount, // <--- EXPORTAMOS EL DATO NUEVO
        page,
        setPage,
        rowsPerPage,
        isLoading: isLoading || isAuthLoading,
        reload: fetchLeads,
        sortDescriptor,
        setSortDescriptor,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', status: 'all', temperature: 'all', dateRange: 'all', assignedTo: 'all' }),
        sellers
    };
}