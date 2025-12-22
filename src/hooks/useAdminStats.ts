import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

export type AdminDateFilter = 'today' | '7days' | 'thisMonth' | 'custom';

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

        // Configuración por defecto para el final del rango (se sobrescribe en lógica custom)
        end.setHours(23, 59, 59, 999);

        if (dateFilter === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'thisMonth') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'custom') {
            // Desglosamos la fecha string (YYYY-MM-DD) para crear la fecha local correctamente
            // y evitar problemas de zona horaria UTC.
            const [year, month, day] = customDate.split('-').map(Number);

            // Inicio: 00:00:00.000
            start = new Date(year, month - 1, day, 0, 0, 0, 0);
            
            // Fin: 23:59:59.999
            end = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        return {
            startISO: start.toISOString(),
            endISO: end.toISOString()
        };
    }, [dateFilter, customDate]);

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

            // 2. Ejecutar consultas en paralelo
            const [
                leadsRes,
                showroomRes,
                appointmentsRes,
                requestsRes,
                proformasRes
            ] = await Promise.all([
                // A. Leads
                supabase.from('leads')
                    .select('assigned_to')
                    .gte('updated_at', startISO)
                    .lte('updated_at', endISO)
                    .not('assigned_to', 'is', null)
                    .not('resume', 'is', null)
                    .neq('resume', ''),

                // B. Showrooms
                supabase.from('showroom_visits')
                    .select('salesperson_id')
                    .gte('created_at', startISO)
                    .lte('created_at', endISO)
                    .not('salesperson_id', 'is', null),

                // C. Citas
                supabase.from('appointments')
                    .select('responsible_id')
                    .gte('created_at', startISO)
                    .lte('created_at', endISO),

                // D. Pedidos
                supabase.from('vehicle_requests')
                    .select('requested_by')
                    .gte('created_at', startISO)
                    .lte('created_at', endISO)
                    .not('requested_by', 'is', null),

                // E. Proformas
                supabase.from('credit_proformas')
                    .select('created_by')
                    .gte('created_at', startISO)
                    .lte('created_at', endISO)
                    .not('created_by', 'is', null)
            ]);

            // 3. Mapear resultados (Solo si el ID existe en nuestro mapa de vendedores)
            leadsRes.data?.forEach(l => {
                if (l.assigned_to && statsMap[l.assigned_to]) statsMap[l.assigned_to].leads_responded++;
            });

            showroomRes.data?.forEach(s => {
                if (s.salesperson_id && statsMap[s.salesperson_id]) statsMap[s.salesperson_id].showroom_created++;
            });

            appointmentsRes.data?.forEach(a => {
                if (a.responsible_id && statsMap[a.responsible_id]) statsMap[a.responsible_id].appointments_created++;
            });

            requestsRes.data?.forEach(r => {
                if (r.requested_by && statsMap[r.requested_by]) statsMap[r.requested_by].requests_created++;
            });

            proformasRes.data?.forEach(p => {
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
    }, [supabase, getDateRangeISO]);

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