import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShowroomVisit } from "@/components/features/showroom/constants";
import { mapKommoIdsByPhone, phoneLast9 } from "@/lib/leads/openKommoChat";

const VISIT_PAGE_SIZE = 800;

export type KommoChatFilter = "all" | "with_chat" | "without_chat";

export function useShowroom() {
    const { supabase, user, profile, isAdminLike, isLoading: isAuthLoading } = useAuth();

    // --- ESTADOS DE DATOS ---
    const [visits, setVisits] = useState<ShowroomVisit[]>([]);
    const [salespersons, setSalespersons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = isAdminLike;
    const userRole = isAdmin ? 'admin' : (profile?.role ?? null);

    // --- ESTADOS DE FILTROS ---
    const [filters, setFilters] = useState({
        search: "",
        date: "today",
        dateFrom: "",
        dateTo: "",
        salesperson: "all",
        kommoChat: "all" as KommoChatFilter,
    });

    // 2. CARGAR LISTA DE VENDEDORES (Solo si es Admin)
    useEffect(() => {
        if (isAdmin) {
            const fetchSalespersons = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('status', 'activo') // Filtramos activos
                    .eq('role', 'vendedor') // <--- CAMBIO: Filtramos solo Vendedores
                    .order('full_name');
                
                if (data) setSalespersons(data);
            };
            fetchSalespersons();
        }
    }, [isAdmin, supabase]);

    // 3. CARGAR VISITAS (Core Logic)
    const fetchVisits = useCallback(async () => {
        // No cargamos hasta saber quién es el usuario y su rol
        if (!user || isAuthLoading) return;

        setIsLoading(true);

        try {
            const buildQuery = () => {
                let query = supabase
                    .from('showroom_visits')
                    .select(`
                        id,
                        salesperson_id,
                        inventoryoracle_id,
                        client_name,
                        phone,
                        visit_start,
                        visit_end,
                        source,
                        test_drive,
                        credit_status,
                        observation,
                        created_at,
                        manual_vehicle_description,
                        inventoryoracle (id, brand, model, year, price),
                        profiles (full_name),
                        showroom_visit_gestiones (
                            id,
                            created_at,
                            type,
                            content,
                            author_id,
                            profiles:author_id (full_name)
                        )
                    `)
                    .order('visit_start', { ascending: false })
                    .order('created_at', {
                        ascending: false,
                        foreignTable: 'showroom_visit_gestiones',
                    })
                    .limit(1, { foreignTable: 'showroom_visit_gestiones' });

                if (filters.search) {
                    query = query.ilike('client_name', `%${filters.search}%`);
                }

                const now = new Date();
                const getLocalDateISO = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };

                if (filters.date === 'today') {
                    const todayStr = getLocalDateISO(now);
                    const startOfDay = new Date(`${todayStr}T00:00:00`).toISOString();
                    const endOfDay = new Date(`${todayStr}T23:59:59.999`).toISOString();
                    query = query.gte('visit_start', startOfDay).lte('visit_start', endOfDay);
                } else if (filters.date === 'yesterday') {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = getLocalDateISO(yesterday);
                    const startOfDay = new Date(`${yesterdayStr}T00:00:00`).toISOString();
                    const endOfDay = new Date(`${yesterdayStr}T23:59:59.999`).toISOString();
                    query = query.gte('visit_start', startOfDay).lte('visit_start', endOfDay);
                } else if (filters.date === 'week') {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    query = query.gte('visit_start', weekAgo.toISOString());
                } else if (filters.date === 'month') {
                    const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                    query = query.gte('visit_start', new Date(`${firstDayStr}T00:00:00`).toISOString());
                } else if (filters.date === 'custom' && filters.dateFrom && filters.dateTo) {
                    const from = filters.dateFrom <= filters.dateTo ? filters.dateFrom : filters.dateTo;
                    const to = filters.dateFrom <= filters.dateTo ? filters.dateTo : filters.dateFrom;
                    query = query
                        .gte('visit_start', new Date(`${from}T00:00:00`).toISOString())
                        .lte('visit_start', new Date(`${to}T23:59:59.999`).toISOString());
                }

                if (isAdmin) {
                    if (filters.salesperson !== 'all') {
                        query = query.eq('salesperson_id', filters.salesperson);
                    }
                } else {
                    query = query.eq('salesperson_id', user.id);
                }

                return query;
            };

            const rows: ShowroomVisit[] = [];
            let from = 0;
            while (true) {
                const { data, error } = await buildQuery().range(from, from + VISIT_PAGE_SIZE - 1);
                if (error) throw error;
                const page = (data as ShowroomVisit[] | null) ?? [];
                rows.push(...page);
                if (page.length < VISIT_PAGE_SIZE) break;
                from += VISIT_PAGE_SIZE;
            }

            const kommoByPhone = await mapKommoIdsByPhone(
                supabase,
                rows.map((row) => row.phone)
            );

            setVisits(
                rows.map((row) => ({
                    ...row,
                    lead_id_kommo: kommoByPhone.get(phoneLast9(row.phone)) ?? null,
                }))
            );

        } catch (error) {
            console.error("Error cargando showroom:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        user,
        isAuthLoading,
        isAdmin,
        filters.search,
        filters.date,
        filters.dateFrom,
        filters.dateTo,
        filters.salesperson,
        supabase,
    ]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    const visibleVisits = useMemo(() => {
        if (filters.kommoChat === "with_chat") {
            return visits.filter((row) => row.lead_id_kommo);
        }
        if (filters.kommoChat === "without_chat") {
            return visits.filter((row) => !row.lead_id_kommo);
        }
        return visits;
    }, [visits, filters.kommoChat]);

    // Helpers para actualizar filtros limpiamente
    const getTodayLocalISO = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const setSearchTerm = (val: string) => setFilters(prev => ({ ...prev, search: val }));
    const setDateFilter = (val: string) => {
        if (val === 'custom') {
            const today = getTodayLocalISO();
            setFilters(prev => ({
                ...prev,
                date: 'custom',
                dateFrom: prev.dateFrom || today,
                dateTo: prev.dateTo || today,
            }));
            return;
        }
        setFilters(prev => ({ ...prev, date: val, dateFrom: '', dateTo: '' }));
    };
    const setCustomDateRange = (from: string, to: string) => {
        if (!from && !to) return;
        let dateFrom = from;
        let dateTo = to;
        if (dateFrom && dateTo && dateFrom > dateTo) {
            dateTo = dateFrom;
        }
        setFilters(prev => ({
            ...prev,
            date: 'custom',
            dateFrom: dateFrom || prev.dateFrom,
            dateTo: dateTo || prev.dateTo,
        }));
    };
    const setSelectedSalesperson = (val: string) => setFilters(prev => ({ ...prev, salesperson: val }));
    const setKommoChatFilter = (val: KommoChatFilter) => setFilters(prev => ({ ...prev, kommoChat: val }));

    return {
        // Data
        visits: visibleVisits,
        salespersons,
        isLoading,
        userRole,
        isAdmin, // Exportamos esto para usarlo fácil en la UI
        
        // Filters State
        filters,
        
        // Actions
        setSearchTerm,
        setDateFilter,
        setCustomDateRange,
        setSelectedSalesperson,
        setKommoChatFilter,
        reload: fetchVisits
    };
}