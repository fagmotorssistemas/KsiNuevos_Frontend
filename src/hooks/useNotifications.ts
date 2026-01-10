import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationAppointment {
    id: number;
    title: string;
    start_time: string;
    location: string | null;
    status: string;
    external_client_name: string | null;
    lead?: {
        name: string;
    };
}

export function useNotifications() {
    const { supabase, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationAppointment[]>([]);
    const [loading, setLoading] = useState(true);

    // Clave para localStorage
    const STORAGE_KEY = 'dismissed_appointment_ids';

    useEffect(() => {
        if (!user) return;

        const fetchUpcomingAppointments = async () => {
            try {
                // 1. Obtener IDs descartados localmente
                const storedDismissed = localStorage.getItem(STORAGE_KEY);
                const dismissedIds: number[] = storedDismissed ? JSON.parse(storedDismissed) : [];

                // 2. Definir rango de tiempo (Ahora hasta dentro de 20 minutos)
                const now = new Date();
                const timeWindow = new Date(now.getTime() + 20 * 60000); // 20 minutos ventana

                // 3. Consulta a Supabase
                const { data, error } = await supabase
                    .from('appointments')
                    .select(`
                        id,
                        title,
                        start_time,
                        location,
                        status,
                        external_client_name,
                        lead_id,
                        leads ( name )
                    `)
                    .eq('responsible_id', user.id)
                    .in('status', ['pendiente', 'confirmada', 'reprogramada']) // Solo activas
                    .gte('start_time', now.toISOString()) // Desde ahora
                    .lte('start_time', timeWindow.toISOString()) // Hasta 20 mins
                    .order('start_time', { ascending: true });

                if (error) throw error;

                // 4. Filtrar las que ya fueron descartadas
                const activeNotifications = (data || []).map((item: any) => ({
                    ...item,
                    lead: item.leads // Aplanar estructura si viene de relación
                })).filter((apt: NotificationAppointment) => !dismissedIds.includes(apt.id));

                setNotifications(activeNotifications);
            } catch (err) {
                console.error("Error buscando notificaciones:", err);
            } finally {
                setLoading(false);
            }
        };

        // Ejecutar inmediatamente
        fetchUpcomingAppointments();

        // Polling: Ejecutar cada 60 segundos para actualizar
        const interval = setInterval(fetchUpcomingAppointments, 60 * 1000);

        return () => clearInterval(interval);
    }, [user, supabase]);

    const markAsRead = (id: number) => {
        // 1. Actualizar estado local (UI instantánea)
        setNotifications(prev => prev.filter(n => n.id !== id));

        // 2. Guardar en localStorage para persistencia
        const storedDismissed = localStorage.getItem(STORAGE_KEY);
        const dismissedIds: number[] = storedDismissed ? JSON.parse(storedDismissed) : [];
        
        if (!dismissedIds.includes(id)) {
            const newDismissed = [...dismissedIds, id];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newDismissed));
        }
    };

    return { 
        notifications, 
        markAsRead, 
        loading,
        hasNotifications: notifications.length > 0 
    };
}