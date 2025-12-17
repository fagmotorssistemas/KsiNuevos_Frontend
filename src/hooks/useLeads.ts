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
    exactDate: string; // Formato YYYY-MM-DD
    assignedTo: string | 'all';
};

const isSameDate = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

export function useLeads() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // Estado de Datos
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [sellers, setSellers] = useState<{ id: string; full_name: string }[]>([]);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    // Agregamos un estado opcional para saber si se está recargando en background (opcional)
    const [isRefetching, setIsRefetching] = useState(false);

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
        exactDate: '', 
        assignedTo: 'all'
    });

    // 1. CARGA DE DATOS INTELIGENTE
    // showLoading: true -> Bloquea la UI o muestra spinner (Carga inicial o Botón Manual)
    // showLoading: false -> Actualiza en silencio (Realtime)
    const fetchLeads = useCallback(async (showLoading = false) => {
        if (!user) return;
        
        if (showLoading) {
            setIsLoading(true);
        } else {
            setIsRefetching(true);
        }

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
        
        if (showLoading) {
            setIsLoading(false);
        } else {
            setIsRefetching(false);
        }
    }, [supabase, user]);

    // 2. CARGA DE VENDEDORES
    const fetchSellers = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('status', 'activo')
            .order('full_name');
            
        if (data) {
            // @ts-ignore
            setSellers(data);
        }
    }, [supabase, user]);

    // 3. EFECTO INICIAL (Carga con Spinner)
    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchLeads(true); // true = Mostrar 'Cargando...'
            fetchSellers();
        }
    }, [isAuthLoading, user, fetchLeads, fetchSellers]);

    // 4. SUSCRIPCIÓN EN TIEMPO REAL (Carga Silenciosa)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('realtime leads')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leads' },
                (payload) => {
                    console.log('Cambio realtime:', payload);
                    fetchLeads(false); // false = No molestar al usuario visualmente
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, user, fetchLeads]);

    // --- PROCESAMIENTO Y FILTROS ---
    const processedLeads = useMemo(() => {
        let filtered = [...leads];

        if (filters.search.trim()) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(l =>
                l.name.toLowerCase().includes(query) ||
                l.phone?.includes(query) ||
                (l.lead_id_kommo && l.lead_id_kommo.toString().toLowerCase().includes(query)) ||
                (l.profiles?.full_name && l.profiles.full_name.toLowerCase().includes(query)) ||
                (l.interested_cars && l.interested_cars.some(car => 
                    car.brand.toLowerCase().includes(query) || 
                    car.model.toLowerCase().includes(query)
                ))
            );
        }

        if (filters.status !== 'all') filtered = filtered.filter(l => l.status === filters.status);
        if (filters.temperature !== 'all') filtered = filtered.filter(l => l.temperature === filters.temperature);
        if (filters.assignedTo !== 'all') filtered = filtered.filter(l => l.assigned_to === filters.assignedTo);

        if (filters.exactDate) {
            filtered = filtered.filter(l => {
                if (!l.created_at) return false;
                const leadDate = new Date(l.created_at);
                const filterDate = new Date(filters.exactDate + 'T00:00:00'); 
                return isSameDate(leadDate, filterDate);
            });
        } else if (filters.dateRange !== 'all') {
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

    // --- MÉTRICAS ---
    const filteredRespondedCount = useMemo(() => {
        return processedLeads.filter(l => l.resume !== null && l.resume.trim() !== '').length;
    }, [processedLeads]);

    const interactionsCount = useMemo(() => {
        let interactions = leads;
        if (filters.assignedTo !== 'all') {
            interactions = interactions.filter(l => l.assigned_to === filters.assignedTo);
        }
        const targetDate = filters.exactDate 
            ? new Date(filters.exactDate + 'T00:00:00')
            : new Date(); 

        interactions = interactions.filter(l => {
            if (!l.resume || l.resume.trim() === '') return false;
            if (!l.updated_at) return false;
            const updateDate = new Date(l.updated_at);
            return isSameDate(updateDate, targetDate);
        });

        return interactions.length;
    }, [leads, filters.assignedTo, filters.exactDate]);

    useEffect(() => {
        setPage(1);
    }, [filters, sortDescriptor]);

    const paginatedLeads = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return processedLeads.slice(startIndex, startIndex + rowsPerPage);
    }, [processedLeads, page, rowsPerPage]);

    const updateFilter = (key: keyof LeadsFilters, value: any) => {
        if (key === 'exactDate' && value !== '') {
            setFilters(prev => ({ ...prev, exactDate: value, dateRange: 'all' }));
        } else if (key === 'dateRange' && value !== 'all') {
            setFilters(prev => ({ ...prev, dateRange: value, exactDate: '' }));
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    return {
        leads: paginatedLeads,
        totalCount: processedLeads.length,
        rawCount: leads.length,
        respondedCount: filteredRespondedCount, 
        interactionsCount, 
        page,
        setPage,
        rowsPerPage,
        isLoading: isLoading || isAuthLoading, // Esto controla el estado visual del botón
        reload: () => fetchLeads(true), // <--- AQUÍ ESTÁ EL FIX: Forzamos el spinner al hacer click manual
        sortDescriptor,
        setSortDescriptor,
        filters,
        updateFilter,
        resetFilters: () => setFilters({ search: '', status: 'all', temperature: 'all', dateRange: 'all', exactDate: '', assignedTo: 'all' }),
        sellers
    };
}