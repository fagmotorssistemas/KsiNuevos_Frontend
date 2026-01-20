import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
// Ajusta esta importación según donde tengas tus tipos
import { ShowroomVisit } from "@/components/features/showroom/constants";

export function useShowroom() {
    const { supabase, user } = useAuth();

    // --- ESTADOS DE DATOS ---
    const [visits, setVisits] = useState<ShowroomVisit[]>([]);
    const [salespersons, setSalespersons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- ESTADO DE PERMISOS ---
    const [userRole, setUserRole] = useState<string | null>(null);

    // --- ESTADOS DE FILTROS ---
    const [filters, setFilters] = useState({
        search: "",
        date: "today",
        salesperson: "all"
    });

    // Calculamos si es admin basado en el rol real recuperado de la BD
    const isAdmin = userRole === 'admin';

    // 1. OBTENER ROL DEL USUARIO REAL
    useEffect(() => {
        if (!user) return;

        const fetchUserRole = async () => {
            // Asumiendo que el rol está en la tabla 'profiles'
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (data) {
                setUserRole(data.role);
            } else if (error) {
                console.error("Error al obtener rol:", error);
                // Fallback seguro: si falla, asumimos que NO es admin
                setUserRole('salesperson');
            }
        };

        fetchUserRole();
    }, [user, supabase]);

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
        if (!user || userRole === null) return;

        setIsLoading(true);

        try {
            let query = supabase
                .from('showroom_visits')
                .select(`
                    *,
                    inventory (id, brand, model, year, price),
                    profiles (full_name)
                `)
                .order('visit_start', { ascending: false });

            // --- APLICAR FILTROS ---

            // A. Buscador (Cliente)
            if (filters.search) {
                query = query.ilike('client_name', `%${filters.search}%`);
            }

            // B. Fechas - CORRECCIÓN DE ZONA HORARIA
            const now = new Date(); // Fecha local del navegador

            // Helper para obtener YYYY-MM-DD local
            const getLocalDateISO = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            if (filters.date === 'today') {
                // Rango: Hoy 00:00 local hasta Hoy 23:59 local
                const todayStr = getLocalDateISO(now);
                const startOfDay = new Date(`${todayStr}T00:00:00`).toISOString();
                const endOfDay = new Date(`${todayStr}T23:59:59.999`).toISOString();
                
                query = query.gte('visit_start', startOfDay)
                             .lte('visit_start', endOfDay);

            } else if (filters.date === 'yesterday') {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = getLocalDateISO(yesterday);
                
                const startOfDay = new Date(`${yesterdayStr}T00:00:00`).toISOString();
                const endOfDay = new Date(`${yesterdayStr}T23:59:59.999`).toISOString();

                query = query.gte('visit_start', startOfDay)
                             .lte('visit_start', endOfDay);

            } else if (filters.date === 'week') {
                // Últimos 7 días
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                // Usamos la fecha calculada para asegurar consistencia
                query = query.gte('visit_start', weekAgo.toISOString());

            } else if (filters.date === 'month') {
                // Este mes (desde el día 1 del mes local)
                const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const firstDayDate = new Date(`${firstDayStr}T00:00:00`).toISOString();
                query = query.gte('visit_start', firstDayDate);
            }

            // C. Responsable (Seguridad RLS simulada en cliente)
            if (isAdmin) {
                // Si es admin, puede filtrar por vendedor específico
                if (filters.salesperson !== 'all') {
                    query = query.eq('salesperson_id', filters.salesperson);
                }
            } else {
                // Si NO es admin, FORZAMOS a ver solo sus propios registros
                query = query.eq('salesperson_id', user.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setVisits(data as any || []);

        } catch (error) {
            console.error("Error cargando showroom:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, userRole, isAdmin, filters, supabase]);

    // Recargar cuando cambian filtros o usuario
    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    // Helpers para actualizar filtros limpiamente
    const setSearchTerm = (val: string) => setFilters(prev => ({ ...prev, search: val }));
    const setDateFilter = (val: string) => setFilters(prev => ({ ...prev, date: val }));
    const setSelectedSalesperson = (val: string) => setFilters(prev => ({ ...prev, salesperson: val }));

    return {
        // Data
        visits,
        salespersons,
        isLoading,
        userRole,
        isAdmin, // Exportamos esto para usarlo fácil en la UI
        
        // Filters State
        filters,
        
        // Actions
        setSearchTerm,
        setDateFilter,
        setSelectedSalesperson,
        reload: fetchVisits
    };
}