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

            // B. Fechas
            const now = new Date();
            if (filters.date === 'today') {
                const today = now.toISOString().split('T')[0];
                query = query.gte('visit_start', `${today}T00:00:00`);
            } else if (filters.date === 'yesterday') {
                const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
                query = query.gte('visit_start', `${yesterday}T00:00:00`).lt('visit_start', `${yesterday}T23:59:59`);
            } else if (filters.date === 'week') {
                const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
                query = query.gte('visit_start', weekAgo);
            } else if (filters.date === 'month') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                query = query.gte('visit_start', firstDay);
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