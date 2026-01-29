import { useState, useEffect, useCallback } from 'react';
import { Database } from '@/types/supabase';
import { 
    WebAppointmentWithDetails, 
    WebAppointmentFilter, 
    WebAppointmentStatus 
} from '@/types/web-appointments';
import { useAuth } from '@/hooks/useAuth';

export function useWebAppointments() {
    const { supabase, profile } = useAuth();
    
    const [appointments, setAppointments] = useState<WebAppointmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<WebAppointmentFilter>('all');

    const fetchAppointments = useCallback(async () => {
        if (!supabase) return;
        
        setLoading(true);
        try {
            // Consulta con joins forzando la relación correcta para ventas
            const { data, error } = await supabase
                .from('web_appointments')
                .select(`
                    *,
                    client:client_user_id(*),
                    responsible:responsible_id(*),
                    vehicle_buying:inventory_id(*),
                    vehicle_selling:web_sell_requests!web_appointments_sell_request_id_fkey(*)
                `)
                .order('appointment_date', { ascending: true });

            if (error) throw error;
            
            // Cast de datos al tipo enriquecido definido en web-appointments.ts
            setAppointments(data as unknown as WebAppointmentWithDetails[]);
        } catch (error) {
            console.error('Error fetching web appointments:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchAppointments();
        
        if (!supabase) return;

        // Suscripción en tiempo real a cambios en la tabla
        const channel = supabase
            .channel('web_appointments_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'web_appointments' 
            }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAppointments, supabase]);

    const assignToMe = async (appointmentId: number) => {
        if (!profile?.id || !supabase) return;
        try {
            // Se actualiza el estado a 'aceptado' para coincidir con el tipo WebAppointmentStatus
            const { error } = await supabase
                .from('web_appointments')
                .update({ 
                    responsible_id: profile.id, 
                    status: 'aceptado' 
                })
                .eq('id', appointmentId);
            
            if (error) throw error;
            await fetchAppointments();
        } catch (err) {
            console.error("Error assigning appointment:", err);
        }
    };

    const updateStatus = async (appointmentId: number, newStatus: WebAppointmentStatus) => {
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('web_appointments')
                .update({ status: newStatus })
                .eq('id', appointmentId);
            
            if (error) throw error;
            await fetchAppointments();
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    // Lógica de filtrado simplificada y tipada
    const filteredAppointments = appointments.filter(appt => {
        if (filter === 'all') return true;
        
        // Dado que WebAppointmentFilter usa los mismos strings que appt.status,
        // la comparación es directa y segura.
        return appt.status === filter;
    });

    return {
        appointments: filteredAppointments,
        loading,
        setFilter,
        currentFilter: filter,
        actions: { 
            assignToMe, 
            updateStatus, 
            refresh: fetchAppointments 
        }
    };
}