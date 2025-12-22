import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];
type CarRow = Database['public']['Tables']['interested_cars']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ACTUALIZACIÓN: Lead ahora puede ser null | undefined
export type AppointmentWithDetails = AppointmentRow & {
    lead: (LeadRow & {
        interested_cars: CarRow[];
    }) | null; 
    responsible?: ProfileRow;
};

export type AgendaTab = 'pending' | 'history';

// Tipos para los filtros
export type DateFilterOption = 'all' | 'today' | 'tomorrow' | 'week' | 'fortnight' | 'month';
export interface AgendaFilters {
    responsibleId: string | 'all';
    dateRange: DateFilterOption;
}

export function useAgenda() {
    const { supabase, user, profile } = useAuth();

    // Estados de Datos
    const [allAppointments, setAllAppointments] = useState<AppointmentWithDetails[]>([]);
    const [agents, setAgents] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Filtros (Solo Admin)
    const [filters, setFilters] = useState<AgendaFilters>({
        responsibleId: 'all',
        dateRange: 'all'
    });

    // Estados de UI
    const [activeTab, setActiveTab] = useState<AgendaTab>('pending');

    const isAdmin = profile?.role === 'admin';

    // 1. CARGAR USUARIOS (FILTRADO POR ROL VENDEDOR)
    const fetchAgents = useCallback(async () => {
        if (!isAdmin) return;
        
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('status', 'activo') // Solo usuarios activos
            .eq('role', 'vendedor') // <--- CAMBIO: Solo Vendedores
            .order('full_name', { ascending: true });
            
        if (data) setAgents(data);
    }, [supabase, isAdmin]);

    // 2. CARGAR CITAS
    const fetchAppointments = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        // NOTA: Supabase manejará el LEFT JOIN automáticamente. 
        // Si lead_id es null, el objeto 'lead' vendrá como null.
        let query = supabase
            .from('appointments')
            .select(`
                *,
                lead:leads (
                    *,
                    interested_cars (*)
                ),
                responsible:profiles (*) 
            `);

        if (!isAdmin) {
            query = query.eq('responsible_id', user.id);
        }

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) {
            console.error("Error cargando agenda:", error);
        } else {
            // @ts-ignore
            setAllAppointments((data || []) as AppointmentWithDetails[]);
        }
        
        setIsLoading(false);
    }, [supabase, user, isAdmin]);

    useEffect(() => {
        fetchAppointments();
        fetchAgents();
    }, [fetchAppointments, fetchAgents]);


    // 3. LOGICA DE FILTRADO
    const filteredList = useMemo(() => {
        let result = allAppointments;

        // A. Filtro por Responsable
        if (isAdmin && filters.responsibleId !== 'all') {
            result = result.filter(a => a.responsible_id === filters.responsibleId);
        }

        // B. Filtro por Fechas
        if (filters.dateRange !== 'all') {
            const now = new Date();
            const todayStart = new Date(now.setHours(0,0,0,0));
            const todayEnd = new Date(now.setHours(23,59,59,999));
            
            result = result.filter(a => {
                const apptDate = new Date(a.start_time);
                
                switch (filters.dateRange) {
                    case 'today':
                        return apptDate >= todayStart && apptDate <= todayEnd;
                    
                    case 'tomorrow':
                        const tmrStart = new Date(todayStart); tmrStart.setDate(tmrStart.getDate() + 1);
                        const tmrEnd = new Date(todayEnd); tmrEnd.setDate(tmrEnd.getDate() + 1);
                        return apptDate >= tmrStart && apptDate <= tmrEnd;

                    case 'week':
                        const weekEnd = new Date(todayEnd); weekEnd.setDate(weekEnd.getDate() + 7);
                        return apptDate >= todayStart && apptDate <= weekEnd;

                    case 'fortnight':
                        const fortnightEnd = new Date(todayEnd); fortnightEnd.setDate(fortnightEnd.getDate() + 15);
                        return apptDate >= todayStart && apptDate <= fortnightEnd;
                        
                    case 'month':
                        const monthEnd = new Date(todayEnd); monthEnd.setDate(monthEnd.getDate() + 30);
                        return apptDate >= todayStart && apptDate <= monthEnd;
                        
                    default:
                        return true;
                }
            });
        }

        return result;
    }, [allAppointments, filters, isAdmin]);


    // 4. PROCESAMIENTO
    const { pendingAppointments, historyAppointments } = useMemo(() => {
        const activeStatuses = ['pendiente', 'confirmada', 'reprogramada'];
        
        const pending = filteredList
            .filter(a => activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        const history = filteredList
            .filter(a => !activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        return { pendingAppointments: pending, historyAppointments: history };
    }, [filteredList]);


    // 5. ACCIONES
    const markAsCompleted = async (id: number) => {
        setAllAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completada' } : a));
        const { error } = await supabase.from('appointments').update({ status: 'completada' }).eq('id', id);
        if (error) fetchAppointments();
    };

    const cancelAppointment = async (id: number) => {
        setAllAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelada' } : a));
        const { error } = await supabase.from('appointments').update({ status: 'cancelada' }).eq('id', id);
        if (error) fetchAppointments();
    };

    // 6. AGRUPAMIENTO VISUAL
    const groupAppointmentsByDate = (list: AppointmentWithDetails[]) => {
        const groups: Record<string, AppointmentWithDetails[]> = {};

        list.forEach(appt => {
            const date = new Date(appt.start_time);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let key = date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });

            if (isSameDay(date, today)) key = "Hoy";
            else if (isSameDay(date, tomorrow)) key = "Mañana";

            if (!groups[key]) groups[key] = [];
            groups[key].push(appt);
        });
        return groups;
    };

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getDate() === d2.getDate() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getFullYear() === d2.getFullYear();


    return {
        groupedPending: groupAppointmentsByDate(pendingAppointments),
        groupedHistory: groupAppointmentsByDate(historyAppointments),
        pendingCount: pendingAppointments.length,
        isLoading,
        isAdmin,
        agents,
        filters,
        setFilters,
        activeTab,
        setActiveTab,
        refresh: fetchAppointments,
        actions: { markAsCompleted, cancelAppointment }
    };
}