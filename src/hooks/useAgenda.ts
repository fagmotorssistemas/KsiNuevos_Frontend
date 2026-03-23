import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];
type CarRow = Database['public']['Tables']['interested_cars']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type BotSuggestionLead = LeadRow & {
    interested_cars: CarRow[];
};

export type AppointmentWithDetails = AppointmentRow & {
    lead: (LeadRow & {
        interested_cars: CarRow[];
    }) | null; 
    responsible?: ProfileRow;
};

// CORRECCIÓN AQUÍ: Agregamos 'web_requests' para que coincida con la UI
export type AgendaTab = 'pending' | 'history' | 'suggestions' | 'web_requests';

export type DateFilterOption =
    | 'all'
    | 'today'
    | 'tomorrow'
    | 'week'
    | 'fortnight'
    | 'month'
    | 'custom';

export interface AgendaFilters {
    responsibleId: string | 'all';
    dateRange: DateFilterOption;
    /** YYYY-MM-DD — solo aplica cuando `dateRange === 'custom'` */
    customDate: string;
}

/** Límites del día en hora local (evita errores con UTC vs local). */
function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addLocalDays(base: Date, days: number): Date {
    const x = new Date(base.getTime());
    x.setDate(x.getDate() + days);
    return x;
}

/**
 * Indica si la cita cae en el rango elegido (comparación en calendario local).
 */
function appointmentMatchesDateFilter(
    startTimeIso: string,
    dateRange: DateFilterOption,
    customDate: string
): boolean {
    const appt = new Date(startTimeIso);
    if (Number.isNaN(appt.getTime())) return false;

    const today = new Date();

    switch (dateRange) {
        case 'all':
            return true;
        case 'today': {
            const s = startOfLocalDay(today);
            const e = endOfLocalDay(today);
            return appt >= s && appt <= e;
        }
        case 'tomorrow': {
            const t = addLocalDays(today, 1);
            const s = startOfLocalDay(t);
            const e = endOfLocalDay(t);
            return appt >= s && appt <= e;
        }
        case 'week': {
            // Próximos 7 días: hoy hasta el final del día (hoy + 6)
            const end = endOfLocalDay(addLocalDays(today, 6));
            return appt >= startOfLocalDay(today) && appt <= end;
        }
        case 'fortnight': {
            const end = endOfLocalDay(addLocalDays(today, 14));
            return appt >= startOfLocalDay(today) && appt <= end;
        }
        case 'month': {
            const end = endOfLocalDay(addLocalDays(today, 29));
            return appt >= startOfLocalDay(today) && appt <= end;
        }
        case 'custom': {
            if (!customDate || !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) return true;
            const [y, m, d] = customDate.split('-').map(Number);
            const day = new Date(y, m - 1, d);
            if (Number.isNaN(day.getTime())) return true;
            const s = startOfLocalDay(day);
            const e = endOfLocalDay(day);
            return appt >= s && appt <= e;
        }
        default:
            return true;
    }
}

/**
 * Fecha/hora de referencia para filtrar sugerencias IA (alineado con BotSuggestionCard).
 * Usa mediodía local en fechas solo-día para evitar desfaces UTC.
 */
function getSuggestionReferenceInstant(lead: BotSuggestionLead): Date | null {
    if (lead.time_reference) {
        const d = new Date(lead.time_reference);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (lead.day_detected) {
        const raw = lead.day_detected.toString().trim();
        const parts = raw.split(/[-/]/);
        if (parts.length >= 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
                const date = new Date(y, m - 1, d, 12, 0, 0, 0);
                return Number.isNaN(date.getTime()) ? null : date;
            }
        }
    }
    if (lead.hour_detected) {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
    }
    if (lead.created_at) {
        const d = new Date(lead.created_at);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export function useAgenda() {
    const { supabase, user, profile } = useAuth();

    // Estados de Datos
    const [allAppointments, setAllAppointments] = useState<AppointmentWithDetails[]>([]);
    const [rawSuggestions, setRawSuggestions] = useState<BotSuggestionLead[]>([]); // Sugerencias crudas desde BD
    const [agents, setAgents] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado de Filtros (Solo Admin)
    const [filters, setFilters] = useState<AgendaFilters>({
        responsibleId: 'all',
        dateRange: 'all',
        customDate: '',
    });

    // Estados de UI
    const [activeTab, setActiveTab] = useState<AgendaTab>('pending');

    const isAdmin = profile?.role === 'admin';

    // 1. CARGAR USUARIOS
    const fetchAgents = useCallback(async () => {
        if (!isAdmin) return;
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('status', 'activo')
            .eq('role', 'vendedor')
            .order('full_name', { ascending: true });
        if (data) setAgents(data);
    }, [supabase, isAdmin]);

    // 2. CARGAR CITAS
    const fetchAppointments = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        // Usamos !responsible_id para resolver la ambigüedad de la FK
        let query = supabase
            .from('appointments')
            .select(`
                *,
                lead:leads (
                    *,
                    interested_cars (*)
                ),
                responsible:profiles!responsible_id (*) 
            `);

        if (!isAdmin) {
            query = query.eq('responsible_id', user.id);
        }

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) {
            console.error("Error cargando agenda:", error.message || JSON.stringify(error));
        } else {
            // @ts-ignore
            setAllAppointments((data || []) as AppointmentWithDetails[]);
        }
        
        setIsLoading(false);
    }, [supabase, user, isAdmin]);

    // 3. CARGAR SUGERENCIAS DEL BOT
    const fetchBotSuggestions = useCallback(async () => {
        if (!user) return;

        let query = supabase
            .from('leads')
            .select(`
                *,
                interested_cars (*)
            `)
            // Traemos leads que tengan AL MENOS un campo detectado
            .or('time_reference.not.is.null,day_detected.not.is.null,hour_detected.not.is.null');

        if (!isAdmin) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando sugerencias:", error.message || error);
        } else {
            // @ts-ignore
            setRawSuggestions((data || []) as BotSuggestionLead[]);
        }
    }, [supabase, user, isAdmin]);

    useEffect(() => {
        fetchAppointments();
        fetchAgents();
        fetchBotSuggestions();
    }, [fetchAppointments, fetchAgents, fetchBotSuggestions]);


    // 4. LOGICA DE FILTRADO Y PROCESAMIENTO

    // A. Filtramos sugerencias que YA tienen cita agendada
    const botSuggestions = useMemo(() => {
        // Obtenemos los IDs de leads que tienen citas activas (no canceladas)
        const activeLeadIds = new Set(
            allAppointments
                .filter(a => a.lead_id && a.status !== 'cancelada' && a.status !== 'no_asistio')
                .map(a => a.lead_id)
        );

        let filtered = rawSuggestions.filter(lead => !activeLeadIds.has(lead.id));

        // NUEVO: Aplicar filtro de responsable si es admin
        if (isAdmin && filters.responsibleId !== 'all') {
            filtered = filtered.filter(lead => lead.assigned_to === filters.responsibleId);
        }

        if (filters.dateRange !== 'all') {
            filtered = filtered.filter((lead) => {
                const ref = getSuggestionReferenceInstant(lead);
                if (!ref) return false;
                return appointmentMatchesDateFilter(
                    ref.toISOString(),
                    filters.dateRange,
                    filters.customDate
                );
            });
        }

        return filtered;
    }, [rawSuggestions, allAppointments, isAdmin, filters]);


    // B. Filtrado de Citas (Admin y Fechas)
    const filteredAppointments = useMemo(() => {
        let result = allAppointments;

        if (isAdmin && filters.responsibleId !== 'all') {
            result = result.filter(a => a.responsible_id === filters.responsibleId);
        }

        if (filters.dateRange !== 'all') {
            result = result.filter((a) =>
                appointmentMatchesDateFilter(a.start_time, filters.dateRange, filters.customDate)
            );
        }
        return result;
    }, [allAppointments, filters, isAdmin]);

    // C. Separación Pendientes vs Historial
    const { pendingAppointments, historyAppointments } = useMemo(() => {
        const activeStatuses = ['pendiente', 'confirmada', 'reprogramada'];
        
        const pending = filteredAppointments
            .filter(a => activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        const history = filteredAppointments
            .filter(a => !activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        return { pendingAppointments: pending, historyAppointments: history };
    }, [filteredAppointments]);


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

    const updateAppointment = async (id: number, updates: Partial<AppointmentRow>) => {
        // @ts-ignore
        setAllAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        const { error } = await supabase.from('appointments').update(updates).eq('id', id);
        if (error) fetchAppointments();
    };

    // NUEVA ACCIÓN: DESCARTAR SUGERENCIA
    const discardSuggestion = async (leadId: number) => {
        // 1. Optimistic UI update: Remover de la lista local inmediatamente
        setRawSuggestions(prev => prev.filter(l => l.id !== leadId));

        // 2. Actualizar BD: Limpiamos los campos que disparan la sugerencia
        const { error } = await supabase
            .from('leads')
            .update({
                time_reference: null,
                day_detected: null,
                hour_detected: null
            })
            .eq('id', leadId);

        if (error) {
            console.error("Error descartando sugerencia:", error);
            fetchBotSuggestions(); // Revertir si falla
        }
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
        botSuggestions, 
        pendingCount: pendingAppointments.length,
        suggestionsCount: botSuggestions.length,
        isLoading,
        isAdmin,
        agents,
        filters,
        setFilters,
        activeTab,
        setActiveTab,
        refresh: () => { fetchAppointments(); fetchBotSuggestions(); },
        actions: { markAsCompleted, cancelAppointment, updateAppointment, discardSuggestion }
    };
}