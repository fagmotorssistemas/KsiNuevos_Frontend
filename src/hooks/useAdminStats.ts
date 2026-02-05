import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase"; // <--- 1. Importamos los tipos de la BD

// AGREGADO: 'lastMonth' al tipo
export type AdminDateFilter = 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';

export type SellerStats = {
    profile_id: string;
    full_name: string;
    leads_responded: number;
    showroom_created: number;
    appointments_created: number;
    requests_created: number;
    proformas_created: number;
    total_activity: number;
};

export function useAdminStats() {
    const { supabase } = useAuth();
    
    // Estados
    const [stats, setStats] = useState<SellerStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<AdminDateFilter>('today');
    
    // Estado para una sola fecha específica (inicializado con hoy)
    const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Calcular rango de fechas exacto (Inicio del día 00:00 - Fin del día 23:59)
    const getDateRangeISO = useCallback(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        // Configuración por defecto para el final del rango
        end.setHours(23, 59, 59, 999);

        if (dateFilter === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'thisMonth') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'lastMonth') {
            // LÓGICA AGREGADA: Mes Pasado
            // 1. Establecer el inicio: Restamos 1 al mes actual y fijamos el día 1
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);

            // 2. Establecer el fin: El día 0 del mes actual es el último día del mes anterior
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilter === 'custom') {
            const [year, month, day] = customDate.split('-').map(Number);
            start = new Date(year, month - 1, day, 0, 0, 0, 0);
            end = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        return {
            startISO: start.toISOString(),
            endISO: end.toISOString()
        };
    }, [dateFilter, customDate]);

    // --- FUNCIÓN HELPER PARA DESCARGA MASIVA (Evita el límite de 1000 filas) ---
    const fetchAllData = useCallback(async (
        table: keyof Database['public']['Tables'], 
        select: string, 
        dateCol: string, 
        startISO: string, 
        endISO: string,
        additionalFilters?: (query: any) => any
    ) => {
        let allRows: any[] = [];
        let hasMore = true;
        let page = 0;
        const PAGE_SIZE = 1000;

        while (hasMore) {
            let query = supabase
                .from(table)
                .select(select)
                .gte(dateCol, startISO)
                .lte(dateCol, endISO)
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            // Aplicar filtros extra si existen (ej: not nulls)
            if (additionalFilters) {
                query = additionalFilters(query);
            }

            const { data, error } = await query;

            if (error) {
                console.error(`Error fetching ${table} page ${page}:`, error);
                throw error;
            }

            if (data) {
                allRows = [...allRows, ...data];
                // Si descargamos menos del límite, significa que ya no hay más datos
                if (data.length < PAGE_SIZE) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
            page++;
            
            // Freno de seguridad para evitar bucles infinitos en casos extremos
            if (page > 50) hasMore = false; 
        }
        return allRows;
    }, [supabase]);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        const { startISO, endISO } = getDateRangeISO();

        try {
            // 1. Obtener SOLO Vendedores Activos
            const { data: sellers } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('status', 'activo')     // Solo activos
                .eq('role', 'vendedor')     // Solo rol vendedor
                .order('full_name');

            if (!sellers) throw new Error("No profiles found");

            // Inicializar mapa
            const statsMap: Record<string, SellerStats> = {};
            sellers.forEach(s => {
                statsMap[s.id] = {
                    profile_id: s.id,
                    full_name: s.full_name,
                    leads_responded: 0,
                    showroom_created: 0,
                    appointments_created: 0,
                    requests_created: 0,
                    proformas_created: 0,
                    total_activity: 0
                };
            });

            // 2. Ejecutar consultas en paralelo usando el Helper de Paginación
            const [
                leadsData,
                showroomData,
                appointmentsData,
                requestsData,
                proformasData
            ] = await Promise.all([
                // A. Leads (Respondidos)
                fetchAllData('leads', 'assigned_to', 'updated_at', startISO, endISO, (q) => 
                    q.not('assigned_to', 'is', null).not('resume', 'is', null).neq('resume', '')
                ),
                // B. Showrooms
                fetchAllData('showroom_visits', 'salesperson_id', 'created_at', startISO, endISO, (q) => 
                    q.not('salesperson_id', 'is', null)
                ),
                // C. Citas
                fetchAllData('appointments', 'responsible_id', 'created_at', startISO, endISO),
                // D. Pedidos
                fetchAllData('vehicle_requests', 'requested_by', 'created_at', startISO, endISO, (q) => 
                    q.not('requested_by', 'is', null)
                ),
                // E. Proformas
                fetchAllData('credit_proformas', 'created_by', 'created_at', startISO, endISO, (q) => 
                    q.not('created_by', 'is', null)
                )
            ]);

            // 3. Mapear resultados (Solo si el ID existe en nuestro mapa de vendedores)
            leadsData.forEach((l: any) => {
                if (l.assigned_to && statsMap[l.assigned_to]) statsMap[l.assigned_to].leads_responded++;
            });

            showroomData.forEach((s: any) => {
                if (s.salesperson_id && statsMap[s.salesperson_id]) statsMap[s.salesperson_id].showroom_created++;
            });

            appointmentsData.forEach((a: any) => {
                if (a.responsible_id && statsMap[a.responsible_id]) statsMap[a.responsible_id].appointments_created++;
            });

            requestsData.forEach((r: any) => {
                if (r.requested_by && statsMap[r.requested_by]) statsMap[r.requested_by].requests_created++;
            });

            proformasData.forEach((p: any) => {
                if (p.created_by && statsMap[p.created_by]) statsMap[p.created_by].proformas_created++;
            });

            const finalStats = Object.values(statsMap).map(s => ({
                ...s,
                total_activity: s.leads_responded + s.showroom_created + s.appointments_created + s.requests_created + s.proformas_created
            })).sort((a, b) => b.total_activity - a.total_activity);

            setStats(finalStats);

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, getDateRangeISO, fetchAllData]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        isLoading,
        dateFilter,
        setDateFilter,
        customDate,      // Exportamos la fecha única
        setCustomDate,   // Exportamos el setter de fecha única
        reload: fetchStats
    };
}