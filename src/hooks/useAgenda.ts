import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];
type CarRow = Database['public']['Tables']['interested_cars']['Row'];

// Tipo Extendido: Cita + Datos del Cliente + Auto de Interés
export type AppointmentWithDetails = AppointmentRow & {
    lead: LeadRow & {
        interested_cars: CarRow[];
    };
};

export type AgendaTab = 'pending' | 'history';

export function useAgenda() {
    const { supabase, user } = useAuth();

    // Estados de Datos
    const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estados Calculados (Derivados)
    const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
    const [historyAppointments, setHistoryAppointments] = useState<AppointmentWithDetails[]>([]);

    // Estados de UI
    const [activeTab, setActiveTab] = useState<AgendaTab>('pending');

    // 1. CARGAR DATOS
    const fetchAppointments = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        // Traemos la cita, el lead asociado y sus autos de interés
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                lead:leads (
                    *,
                    interested_cars (*)
                )
            `)
            .eq('responsible_id', user.id) // Solo mis citas
            .order('start_time', { ascending: true }); // Orden cronológico general

        if (error) {
            console.error("Error cargando agenda:", error);
        } else {
            // @ts-ignore: Supabase join typing workaround
            const allAppointments = (data || []) as AppointmentWithDetails[];
            setAppointments(allAppointments);
            
            // Separar en listas lógica
            processLists(allAppointments);
        }
        setIsLoading(false);
    }, [supabase, user]);

    // Helper para separar pendientes vs historial
    const processLists = (data: AppointmentWithDetails[]) => {
        const activeStatuses = ['pendiente', 'confirmada', 'reprogramada'];
        
        const pending = data
            .filter(a => activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); // Próximas primero

        const history = data
            .filter(a => !activeStatuses.includes(a.status || 'pendiente'))
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // Recientes primero

        setPendingAppointments(pending);
        setHistoryAppointments(history);
    };

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // 2. ACCIONES (Completar, Cancelar)
    
    // Marcar como completada (Check)
    const markAsCompleted = async (id: number) => {
        // Actualización optimista (UI primero)
        updateLocalStatus(id, 'completada');

        const { error } = await supabase
            .from('appointments')
            .update({ status: 'completada' })
            .eq('id', id);

        if (error) {
            console.error("Error al completar cita:", error);
            fetchAppointments(); // Revertir si falla
        }
    };

    // Marcar como cancelada (X)
    const cancelAppointment = async (id: number) => {
        updateLocalStatus(id, 'cancelada');

        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelada' })
            .eq('id', id);

        if (error) {
            fetchAppointments();
        }
    };

    // Helper para actualizar estado localmente rápido sin esperar a la BD
    const updateLocalStatus = (id: number, newStatus: any) => {
        const updatedList = appointments.map(a => 
            a.id === id ? { ...a, status: newStatus } : a
        );
        setAppointments(updatedList);
        processLists(updatedList);
    };

    // 3. AGRUPAMIENTO POR DÍAS (Para la vista visual)
    // Transforma una lista plana en { "Hoy": [...], "Mañana": [...] }
    const groupAppointmentsByDate = (list: AppointmentWithDetails[]) => {
        const groups: Record<string, AppointmentWithDetails[]> = {};

        list.forEach(appt => {
            const date = new Date(appt.start_time);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let key = date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });

            // Etiquetas amigables
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
        appointments,
        pendingAppointments,
        historyAppointments,
        groupedPending: groupAppointmentsByDate(pendingAppointments),
        groupedHistory: groupAppointmentsByDate(historyAppointments),
        isLoading,
        refresh: fetchAppointments,
        activeTab,
        setActiveTab,
        actions: {
            markAsCompleted,
            cancelAppointment
        }
    };
}