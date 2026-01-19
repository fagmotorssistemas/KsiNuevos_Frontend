import { useState, useEffect, useCallback } from 'react';
import { Database } from '@/types/supabase';
import { WebAppointmentWithDetails, WebAppointmentFilter } from '@/types/web-appointments';
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
            // CORRECCIÓN CLAVE:
            // Usamos '!web_appointments_sell_request_id_fkey' para forzar el JOIN correcto.
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

        const channel = supabase
            .channel('web_appointments_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'web_appointments' }, () => {
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
            const { error } = await supabase
                .from('web_appointments')
                .update({ responsible_id: profile.id, status: 'confirmada' })
                .eq('id', appointmentId);
            if (error) throw error;
            await fetchAppointments();
        } catch (err) {
            console.error("Error assigning appointment:", err);
        }
    };

    const updateStatus = async (appointmentId: number, newStatus: string) => {
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

    const filteredAppointments = appointments.filter(appt => {
        if (filter === 'all') return true;
        if (filter === 'pending') return appt.status === 'pendiente';
        if (filter === 'confirmed') return appt.status === 'confirmada';
        if (filter === 'completed') return appt.status === 'completada' || appt.status === 'vendido';
        return true;
    });

    return {
        appointments: filteredAppointments,
        loading,
        setFilter,
        currentFilter: filter,
        actions: { assignToMe, updateStatus, refresh: fetchAppointments }
    };
}