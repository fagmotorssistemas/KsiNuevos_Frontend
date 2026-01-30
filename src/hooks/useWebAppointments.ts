import { useState, useEffect, useCallback } from 'react';
import { 
    WebAppointmentWithDetails, 
    WebAppointmentFilter, 
    WebAppointmentStatus,
    SortOrder 
} from '@/types/web-appointments';
import { useAuth } from '@/hooks/useAuth';

export function useWebAppointments() {
    const { supabase, profile } = useAuth();
    
    const [appointments, setAppointments] = useState<WebAppointmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<WebAppointmentFilter>('all');
    
    const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');

    const fetchAppointments = useCallback(async () => {
        if (!supabase) return;
        
        setLoading(true);
        try {
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

    // --- NUEVA IMPLEMENTACIÓN PARA NOTAS ---
    const updateNotes = async (appointmentId: number, notes: string) => {
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('web_appointments')
                .update({ 
                    notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointmentId);
            
            if (error) throw error;
            
            // Actualizamos la lista local para reflejar el cambio inmediatamente
            await fetchAppointments();
        } catch (err) {
            console.error("Error updating notes:", err);
            throw err; // Re-lanzamos para que el componente maneje el error (ej. mostrar alerta)
        }
    };

    const filteredAppointments = appointments
        .filter(appt => {
            if (filter === 'all') return true;
            return appt.status === filter;
        })
        .sort((a, b) => {
            const dateA = new Date(a.appointment_date).getTime();
            const dateB = new Date(b.appointment_date).getTime();
            
            if (sortOrder === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

    return {
        appointments: filteredAppointments,
        loading,
        setFilter,
        currentFilter: filter,
        sortOrder,
        setSortOrder,
        actions: { 
            assignToMe, 
            updateStatus, 
            updateNotes, // Acción expuesta para el Modal
            refresh: fetchAppointments 
        }
    };
}