import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchLeadsAPI, fetchSellersRequest, fetchDailyInteractions, fetchRequestStats, fetchBudgetStats } from "@/services/leads.service";
import { LeadWithDetails, LeadsFilters } from "@/types/leads.types";


export function useLeads() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // DATOS DE LEADS
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [sellers, setSellers] = useState<{ id: string; full_name: string }[]>([]);

    // MÉTRICAS
    const [totalCount, setTotalCount] = useState(0);
    const [respondedCount, setRespondedCount] = useState(0);
    const [interactionsCount, setInteractionsCount] = useState(0);
    
    const [budgetCount, setBudgetCount] = useState(0);

    // NOTIFICACIONES PENDIENTES
    const [requestStats, setRequestStats] = useState({
        datosPedidos: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 },
        asesoria: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 }
    });

    // ESTADO UI
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    
    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    // --- 1. AGREGAR ESTO (Estado de ordenamiento) ---
   // Le decimos explícitamente que 'direction' SOLO puede ser esas dos opciones
        const [sortDescriptor, setSortDescriptor] = useState<{
            column: string;
            direction: "ascending" | "descending";
        }>({
            column: "updated_at",
            direction: "descending",
        });
    // ------------------------------------------------

    const [filters, setFilters] = useState<LeadsFilters>({
        search: '', status: 'all', temperature: 'all', dateRange: 'all', exactDate: '', assignedTo: 'all', requestStatus: 'all', hasBudget: false
    });

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const resetFilters = () => {
        setPage(1);
        setFilters({
            search: '', status: 'all', temperature: 'all', dateRange: 'all', exactDate: '', assignedTo: 'all', requestStatus: 'all', hasBudget: false
        });
    };

    const loadLeads = useCallback(async (showLoadingScreen = true) => {
        if (!user) return;
        
        if (showLoadingScreen) setIsLoading(true);
        else setIsRefetching(true);

        try {
            const [leadsData, interactions, stats, bCount] = await Promise.all([
                fetchLeadsAPI(supabase, page, rowsPerPage, filters),
                fetchDailyInteractions(supabase, filters.assignedTo, filters.exactDate),
                fetchRequestStats(supabase, filters.assignedTo),
                fetchBudgetStats(supabase, filters.assignedTo)
            ]);

            setLeads(leadsData.data);
            setTotalCount(leadsData.count);
            setRespondedCount(leadsData.respondedCount);
            setInteractionsCount(interactions);
            setRequestStats(stats);
            setBudgetCount(bCount);
            
        } catch (error) {
            console.error("Error cargando leads:", error);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [supabase, user, page, filters]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            loadLeads(true); 
        }
    }, [isAuthLoading, user, page, filters, loadLeads]); 

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchSellersRequest(supabase).then(setSellers);
        }
    }, [isAuthLoading, user, supabase]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('leads-changes-optimized')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, 
                () => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        loadLeads(false); 
                    }, 2000);
                }
            )
            .subscribe();

        return () => { 
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [supabase, user, loadLeads]);

    const updateFilter = (keyOrFilters: keyof LeadsFilters | Partial<LeadsFilters>, value?: any) => {
        setPage(1);
        if (typeof keyOrFilters === 'object') {
            setFilters(prev => ({ ...prev, ...keyOrFilters }));
        } else {
            const key = keyOrFilters as keyof LeadsFilters;
            if (key === 'exactDate' && value !== '') {
                setFilters(prev => ({ ...prev, exactDate: value, dateRange: 'all' }));
            } else if (key === 'status') {
                setFilters(prev => ({ ...prev, status: value, requestStatus: 'all', hasBudget: false }));
            } else {
                setFilters(prev => ({ ...prev, [key]: value }));
            }
        }
    };

    return {
        leads,
        totalCount,
        respondedCount,
        interactionsCount,
        budgetCount,
        requestStats,
        page, setPage, rowsPerPage,
        isLoading,
        isRefetching,
        filters, updateFilter,
        sellers,
        reload: () => loadLeads(true),
        resetFilters,
        
        // --- 2. AGREGAR ESTO AL RETURN ---
        sortDescriptor,
        setSortDescriptor
    };
}