import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
    fetchLeadsAPI,
    fetchSellersRequest,
    fetchDailyInteractions,
    fetchLeadDayMetricBreakdown,
    fetchRequestStats,
    fetchBudgetStats,
    fetchTradeInLeadsCount,
    type LeadDayMetricBreakdown,
} from "@/services/leads.service";
import { LeadWithDetails, LeadsFilters } from "@/types/leads.types";


const MARKETING_DEFAULT_ASSIGNEE_NAME_PART = "fagmotors";
const SEARCH_DEBOUNCE_MS = 400;

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
    const [dayBreakdown, setDayBreakdown] = useState<LeadDayMetricBreakdown | null>(null);
    
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

    const [sortDescriptor, setSortDescriptor] = useState<{
            column: string;
            direction: "ascending" | "descending";
        }>({
            column: "updated_at",
            direction: "descending",
        });

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
        withoutResume: false,
    });

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const didInitFromUrlRef = useRef(false);
    const marketingAssigneeDefaultHandledRef = useRef(false);
    const fetchGenRef = useRef(0);

    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [appliedSearchQuery, setAppliedSearchQuery] = useState("");

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
            withoutResume: false,
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

    useEffect(() => {
        if (!filters.search.trim()) {
            setDebouncedSearch("");
            setPage(1);
            return;
        }

        const timer = window.setTimeout(() => {
            setDebouncedSearch(filters.search);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [filters.search]);

    const queryFilters = useMemo<LeadsFilters>(
        () => ({
            search: debouncedSearch,
            status: filters.status,
            temperature: filters.temperature,
            dateRange: filters.dateRange,
            exactDate: filters.exactDate,
            assignedTo: filters.assignedTo,
            requestStatus: filters.requestStatus,
            hasBudget: filters.hasBudget,
            hasTradeIn: filters.hasTradeIn,
            onlyInteractions: filters.onlyInteractions,
            withoutResume: filters.withoutResume,
        }),
        [
            debouncedSearch,
            filters.status,
            filters.temperature,
            filters.dateRange,
            filters.exactDate,
            filters.assignedTo,
            filters.requestStatus,
            filters.hasBudget,
            filters.hasTradeIn,
            filters.onlyInteractions,
            filters.withoutResume,
        ]
    );

    const resetFilters = () => {
        setPage(1);
        setDebouncedSearch("");
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
            withoutResume: false,
        });
    };

    const loadLeads = useCallback(async (showLoadingScreen = true) => {
        if (!user) return;
        const gen = ++fetchGenRef.current;

        if (showLoadingScreen) {
            setIsLoading(true);
            setLeads([]);
        } else {
            setIsRefetching(true);
        }

        try {
            const leadsData = await fetchLeadsAPI(supabase, page, rowsPerPage, queryFilters, {
                cachedTotal: page > 1 ? totalCount : undefined,
                cachedResponded: page > 1 ? respondedCount : undefined,
            });

            if (gen !== fetchGenRef.current) return;

            setLeads(leadsData.data);
            setTotalCount(leadsData.count);
            setRespondedCount(leadsData.respondedCount);
            setAppliedSearchQuery(queryFilters.search);

            const breakdownPromise = queryFilters.exactDate
                ? fetchLeadDayMetricBreakdown(supabase, queryFilters.exactDate, queryFilters.assignedTo)
                : Promise.resolve(null);

            void Promise.all([
                fetchDailyInteractions(supabase, queryFilters.assignedTo, queryFilters.exactDate),
                fetchRequestStats(supabase, queryFilters.assignedTo),
                fetchBudgetStats(supabase, queryFilters.assignedTo),
                fetchTradeInLeadsCount(supabase, queryFilters.assignedTo),
                breakdownPromise,
            ]).then(([interactions, stats, bCount, tradeInCount, breakdown]) => {
                if (gen !== fetchGenRef.current) return;
                setInteractionsCount(interactions);
                setRequestStats(stats);
                setBudgetCount(bCount);
                setTradeInLeadsCount(tradeInCount);
                setDayBreakdown(breakdown);
            });
            
        } catch (error) {
            if (gen !== fetchGenRef.current) return;
            console.error("Error cargando leads:", error);
            setLeads([]);
            setTotalCount(0);
            setRespondedCount(0);
        } finally {
            if (gen !== fetchGenRef.current) return;
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [supabase, user, page, queryFilters]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            loadLeads(true); 
        }
    }, [isAuthLoading, user, page, queryFilters, loadLeads]); 

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
        const isSearchOnly = keyOrFilters === "search";
        if (!isSearchOnly) setPage(1);
        if (typeof keyOrFilters === 'object') {
            setFilters(prev => ({ ...prev, ...keyOrFilters }));
        } else {
            const key = keyOrFilters as keyof LeadsFilters;
            if (key === 'exactDate' && value !== '') {
                setFilters(prev => ({ ...prev, exactDate: value, dateRange: 'all' }));
            } else if (key === 'exactDate' && value === '') {
                setFilters(prev => ({ ...prev, exactDate: '' }));
            } else if (key === 'dateRange') {
                setFilters(prev => ({ ...prev, dateRange: value, exactDate: '' }));
            } else if (key === 'status') {
                setFilters(prev => ({ ...prev, status: value, requestStatus: 'all', hasBudget: false, hasTradeIn: false, withoutResume: false }));
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
        dayBreakdown,
        budgetCount,
        tradeInLeadsCount,
        requestStats,
        page, setPage, rowsPerPage,
        isLoading,
        isRefetching,
        filters, updateFilter,
        appliedSearchQuery,
        sellers,
        reload: () => loadLeads(true),
        resetFilters,
        sortDescriptor,
        setSortDescriptor
    };
}