import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationItem {
    id: number | string; // String para IDs compuestos si fuera necesario, o number negativo para sugerencias
    type: 'appointment' | 'suggestion';
    title: string;
    start_time: string;
    location: string | null;
    status: string;
    subtitle: string | null; // Nombre cliente o lead
    lead_id?: number | null;
}

export function useNotifications() {
    const { supabase, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Clave para localStorage (Persistencia de "Leídos")
    const STORAGE_KEY = 'dismissed_notifications_v2';

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // 1. Obtener IDs descartados localmente
                const storedDismissed = localStorage.getItem(STORAGE_KEY);
                const dismissedIds: (number | string)[] = storedDismissed ? JSON.parse(storedDismissed) : [];

                // 2. Definir ventana de tiempo (Ahora -> +20 min)
                const now = new Date();
                const timeWindow = new Date(now.getTime() + 20 * 60000); 

                // --- QUERY A: CITAS (Appointments) ---
                const { data: appointmentsData } = await supabase
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
                    .in('status', ['pendiente', 'confirmada', 'reprogramada'])
                    .gte('start_time', now.toISOString())
                    .lte('start_time', timeWindow.toISOString());

                // --- QUERY B: SUGERENCIAS IA (Leads) ---
                const { data: leadsData } = await supabase
                    .from('leads')
                    .select(`
                        id,
                        name,
                        time_reference,
                        interested_cars ( brand, model )
                    `)
                    .eq('assigned_to', user.id)
                    // Solo leads con fecha detectada en el rango
                    .gte('time_reference', now.toISOString())
                    .lte('time_reference', timeWindow.toISOString());

                // 3. PROCESAMIENTO Y UNIFICACIÓN
                
                // A. Formatear Citas
                const formattedAppointments: NotificationItem[] = (appointmentsData || []).map((apt: any) => ({
                    id: apt.id, // ID positivo para citas
                    type: 'appointment',
                    title: apt.title,
                    start_time: apt.start_time,
                    location: apt.location,
                    status: apt.status,
                    subtitle: apt.leads?.name || apt.external_client_name || 'Cliente Externo',
                    lead_id: apt.lead_id
                }));

                // B. Formatear Sugerencias
                // IMPORTANTE: Filtramos sugerencias si el lead YA tiene una cita en el grupo de arriba
                const activeLeadIds = new Set(formattedAppointments.map(a => a.lead_id));

                const formattedSuggestions: NotificationItem[] = (leadsData || [])
                    .filter((lead: any) => !activeLeadIds.has(lead.id)) // Evitar duplicados si ya agendó
                    .map((lead: any) => ({
                        id: `sug-${lead.id}`, // ID único prefijado para evitar colisión
                        type: 'suggestion',
                        title: `Oportunidad: ${lead.name}`,
                        start_time: lead.time_reference, // Usamos la fecha detectada
                        location: 'Detectado por IA',
                        status: 'sugerencia',
                        subtitle: lead.interested_cars?.[0] 
                            ? `${lead.interested_cars[0].brand} ${lead.interested_cars[0].model}` 
                            : 'Interesado en vehículo',
                        lead_id: lead.id
                    }));

                // 4. COMBINAR Y FILTRAR DESCARTADOS
                const allItems = [...formattedAppointments, ...formattedSuggestions]
                    .filter(item => !dismissedIds.includes(item.id))
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                setNotifications(allItems);

            } catch (err) {
                console.error("Error en sistema de notificaciones:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Polling cada 60 segundos
        const interval = setInterval(fetchData, 60 * 1000);
        return () => clearInterval(interval);

    }, [user, supabase]);

    const markAsRead = (id: number | string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        const storedDismissed = localStorage.getItem(STORAGE_KEY);
        const dismissedIds: (number | string)[] = storedDismissed ? JSON.parse(storedDismissed) : [];
        
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