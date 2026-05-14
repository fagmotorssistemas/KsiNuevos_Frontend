import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchLeadsAPI, fetchSellersRequest, fetchDailyInteractions, fetchRequestStats, fetchBudgetStats, fetchTradeInLeadsCount } from "@/services/leads.service";
import { LeadWithDetails, LeadsFilters } from "@/types/leads.types";


const MARKETING_DEFAULT_ASSIGNEE_NAME_PART = "fagmotors";

export function useLeads() {
    const { supabase, user, profile, isLoading: isAuthLoading } = useAuth();
    const searchParams = useSearchParams();

    // DATOS DE LEADS
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [sellers, setSellers] = useState<{ id: string; full_name: string }[]>([]);
    const [sellersHydrated, setSellersHydrated] = useState(false);

    // MÉTRICAS
    const [totalCount, setTotalCount] = useState(0);
    const [respondedCount, setRespondedCount] = useState(0);
    const [interactionsCount, setInteractionsCount] = useState(0);
    
    const [budgetCount, setBudgetCount] = useState(0);
    const [tradeInLeadsCount, setTradeInLeadsCount] = useState(0);

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
        search: '',
        status: 'all',
        temperature: 'all',
        dateRange: 'all',
        exactDate: '',
        assignedTo: 'all',
        requestStatus: 'all',
        hasBudget: false,
        hasTradeIn: false,
        onlyInteractions: false,
    });

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const didInitFromUrlRef = useRef(false);
    const marketingAssigneeDefaultHandledRef = useRef(false);

    useEffect(() => {
        if (didInitFromUrlRef.current) return;
        // Solo inicializamos cuando ya tenemos URL disponible (en App Router siempre lo está),
        // y lo hacemos una sola vez para no pelear con el estado del usuario.
        const status = searchParams.get("status");
        const requestStatus = searchParams.get("requestStatus");
        const assignedTo = searchParams.get("assignedTo");

        if (!status && !requestStatus && !assignedTo) {
            didInitFromUrlRef.current = true;
            return;
        }

        didInitFromUrlRef.current = true;
        setPage(1);
        setFilters((prev) => ({
            ...prev,
            ...(status ? { status } : {}),
            ...(requestStatus ? { requestStatus } : {}),
            ...(assignedTo ? { assignedTo } : {}),
            // Cuando venimos desde un acceso directo, aseguramos que no quede “pegado”
            // un filtro incompatible con el estado.
            hasBudget: false,
            hasTradeIn: false,
            onlyInteractions: false,
        }));
    }, [searchParams]);

    useEffect(() => {
        if (isAuthLoading || !user || !profile) return;
        if (marketingAssigneeDefaultHandledRef.current) return;

        const role = (profile.role || "").toLowerCase().trim();
        if (role !== "marketing") {
            marketingAssigneeDefaultHandledRef.current = true;
            return;
        }
        if (searchParams.get("assignedTo")) {
            marketingAssigneeDefaultHandledRef.current = true;
            return;
        }
        if (!sellersHydrated) return;

        const slug = MARKETING_DEFAULT_ASSIGNEE_NAME_PART.toLowerCase();
        const fromSellers = sellers.find((s) => (s.full_name || "").toLowerCase().includes(slug));
        if (fromSellers) {
            marketingAssigneeDefaultHandledRef.current = true;
            setPage(1);
            setFilters((prev) => ({ ...prev, assignedTo: fromSellers.id }));
            return;
        }

        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id")
                .ilike("full_name", `%${MARKETING_DEFAULT_ASSIGNEE_NAME_PART}%`)
                .limit(1);
            if (cancelled || marketingAssigneeDefaultHandledRef.current) return;
            marketingAssigneeDefaultHandledRef.current = true;
            if (error || !data?.[0]?.id) return;
            setPage(1);
            setFilters((prev) => ({ ...prev, assignedTo: data[0].id as string }));
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthLoading, user, profile, sellers, sellersHydrated, searchParams, supabase]);

    const resetFilters = () => {
        setPage(1);
        setFilters({
            search: '',
            status: 'all',
            temperature: 'all',
            dateRange: 'all',
            exactDate: '',
            assignedTo: 'all',
            requestStatus: 'all',
            hasBudget: false,
            hasTradeIn: false,
            onlyInteractions: false,
        });
    };

    const loadLeads = useCallback(async (showLoadingScreen = true) => {
        if (!user) return;
        
        if (showLoadingScreen) setIsLoading(true);
        else setIsRefetching(true);

        try {
            const [leadsData, interactions, stats, bCount, tradeInCount] = await Promise.all([
                fetchLeadsAPI(supabase, page, rowsPerPage, filters),
                fetchDailyInteractions(supabase, filters.assignedTo, filters.exactDate),
                fetchRequestStats(supabase, filters.assignedTo),
                fetchBudgetStats(supabase, filters.assignedTo),
                fetchTradeInLeadsCount(supabase, filters.assignedTo)
            ]);

            setLeads(leadsData.data);
            setTotalCount(leadsData.count);
            setRespondedCount(leadsData.respondedCount);
            setInteractionsCount(interactions);
            setRequestStats(stats);
            setBudgetCount(bCount);
            setTradeInLeadsCount(tradeInCount);
            
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
            let cancelled = false;
            fetchSellersRequest(supabase).then((rows) => {
                if (cancelled) return;
                setSellers(rows || []);
                setSellersHydrated(true);
            });
            return () => {
                cancelled = true;
            };
        }
        setSellersHydrated(false);
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_in_cars' },
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
                setFilters(prev => ({ ...prev, status: value, requestStatus: 'all', hasBudget: false, hasTradeIn: false }));
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
        tradeInLeadsCount,
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