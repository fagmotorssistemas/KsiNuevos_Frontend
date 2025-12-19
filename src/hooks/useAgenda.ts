import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];
type CarRow = Database['public']['Tables']['interested_cars']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row']; // Asumiendo que existe tabla profiles

// Tipo Extendido: Cita + Datos del Cliente + Auto + (Opcional) Responsable
export type AppointmentWithDetails = AppointmentRow & {
    lead: LeadRow & {
        interested_cars: CarRow[];
    };
    responsible?: ProfileRow; // Para mostrar quién es el dueño de la cita en vista admin
};

export type AgendaTab = 'pending' | 'history';

// Tipos para los filtros
export type DateFilterOption = 'all' | 'today' | 'tomorrow' | 'week' | 'fortnight' | 'month';
export interface AgendaFilters {
    responsibleId: string | 'all';
    dateRange: DateFilterOption;
}

export function useAgenda() {
    const { supabase, user, profile } = useAuth(); // Asumo que profile trae el rol

    // Estados de Datos
    const [allAppointments, setAllAppointments] = useState<AppointmentWithDetails[]>([]);
    const [agents, setAgents] = useState<ProfileRow[]>([]); // Lista de agentes para el filtro
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Filtros (Solo Admin)
    const [filters, setFilters] = useState<AgendaFilters>({
        responsibleId: 'all',
        dateRange: 'all'
    });

    // Estados de UI
    const [activeTab, setActiveTab] = useState<AgendaTab>('pending');

    const isAdmin = profile?.role === 'admin';

    // 1. CARGAR USUARIOS (Solo si es admin, para el dropdown)
    const fetchAgents = useCallback(async () => {
        if (!isAdmin) return;
        
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });
            
        if (data) setAgents(data);
    }, [supabase, isAdmin]);

    // 2. CARGAR CITAS
    const fetchAppointments = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

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

        // LÓGICA CLAVE: Si NO es admin, forzar filtro por su ID.
        // Si ES admin, traemos todo (y luego filtramos en memoria o UI).
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

    // Ejecutar cargas iniciales
    useEffect(() => {
        fetchAppointments();
        fetchAgents();
    }, [fetchAppointments, fetchAgents]);


    // 3. LOGICA DE FILTRADO (Memoizada para rendimiento)
    const filteredList = useMemo(() => {
        let result = allAppointments;

        // A. Filtro por Responsable (Solo afecta si es admin y seleccionó a alguien)
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

                    case 'week': // Próximos 7 días
                        const weekEnd = new Date(todayEnd); weekEnd.setDate(weekEnd.getDate() + 7);
                        return apptDate >= todayStart && apptDate <= weekEnd;

                    case 'fortnight': // Próximos 15 días
                        const fortnightEnd = new Date(todayEnd); fortnightEnd.setDate(fortnightEnd.getDate() + 15);
                        return apptDate >= todayStart && apptDate <= fortnightEnd;
                        
                    case 'month': // Próximos 30 días
                        const monthEnd = new Date(todayEnd); monthEnd.setDate(monthEnd.getDate() + 30);
                        return apptDate >= todayStart && apptDate <= monthEnd;
                        
                    default:
                        return true;
                }
            });
        }

        return result;
    }, [allAppointments, filters, isAdmin]);


    // 4. PROCESAMIENTO (Separar Pendientes vs Historial sobre la lista YA filtrada)
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


    // 5. ACCIONES (Check, Cancelar)
    const markAsCompleted = async (id: number) => {
        // Optimista
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
        // Datos procesados
        groupedPending: groupAppointmentsByDate(pendingAppointments),
        groupedHistory: groupAppointmentsByDate(historyAppointments),
        pendingCount: pendingAppointments.length, // Conteo exacto de lo filtrado
        
        // Estado
        isLoading,
        isAdmin,
        agents, // Lista para el dropdown
        
        // Filtros
        filters,
        setFilters,

        // UI Tabs
        activeTab,
        setActiveTab,
        
        // Acciones
        refresh: fetchAppointments,
        actions: { markAsCompleted, cancelAppointment }
    };
}