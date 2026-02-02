import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationItem {
    id: number | string;
    type: 'appointment' | 'suggestion' | 'task';
    title: string;
    start_time: string;
    location: string | null;
    status: string;
    subtitle: string | null;
    lead_id?: number | null;
}

export function useNotifications() {
    const { supabase, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const STORAGE_KEY = 'dismissed_notifications_v2';

    // Función para disparar notificaciones nativas del sistema
    const triggerNativeNotification = useCallback((title: string, body: string) => {
        if (typeof window !== "undefined" && Notification.permission === "granted") {
            new Notification(title, {
                body,
                icon: "/favicon.ico", 
            });
        }
    }, []);

    // Solicitar permisos al cargar el hook
    useEffect(() => {
        if (typeof window !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const storedDismissed = localStorage.getItem(STORAGE_KEY);
                const dismissedIds: (number | string)[] = storedDismissed ? JSON.parse(storedDismissed) : [];

                const now = new Date();
                
                // --- LÓGICA DE 10 MINUTOS ---
                // Definimos que queremos alertar si la tarea vence en los próximos 10 minutos
                const ALERT_THRESHOLD_MINS = 10; 
                const alertWindow = new Date(now.getTime() + ALERT_THRESHOLD_MINS * 60000); 
                const pastLimit = new Date(now.getTime() - 24 * 60 * 60000); 

                // Consultamos tareas que no estén completadas
                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select(`id, title, priority, due_date, created_at`)
                    .eq('user_id', user.id)
                    .eq('is_completed', false)
                    .gte('created_at', pastLimit.toISOString());

                // Procesamiento de Tareas
                const formattedTasks: NotificationItem[] = (tasksData || []).map((task: any) => {
                    const dueDate = task.due_date ? new Date(task.due_date) : null;
                    
                    // 1. Calculamos la diferencia exacta en minutos
                    const diffMs = dueDate ? dueDate.getTime() - now.getTime() : null;
                    const diffMins = diffMs !== null ? Math.round(diffMs / 60000) : null;

                    // 2. ¿Está dentro del rango de los 10 minutos?
                    // Verificamos que diffMins sea mayor a 0 (no ha pasado) y menor o igual a 10
                    const isUpcoming = diffMins !== null && diffMins > 0 && diffMins <= ALERT_THRESHOLD_MINS;
                    
                    const itemId = isUpcoming ? `alert-${task.id}` : `task-${task.id}`;
                    
                    // 3. Si es inminente y no se ha descartado, disparamos la notificación
                    if (isUpcoming && !dismissedIds.includes(itemId)) {
                        setNotifications(prev => {
                            const alreadyNotified = prev.some(n => n.id === itemId);
                            if (!alreadyNotified) {
                                triggerNativeNotification(
                                    "Tarea Próxima",
                                    `La tarea "${task.title}" vence en ${diffMins} minutos.`
                                );
                            }
                            return prev;
                        });
                    }

                    // 4. Creamos el texto del subtítulo dinámicamente
                    let timeStatus = 'Sin fecha';
                    if (diffMins !== null) {
                        if (diffMins < 0) timeStatus = `Venció hace ${Math.abs(diffMins)} min`;
                        else if (diffMins === 0) timeStatus = `¡Vence ahora!`;
                        else timeStatus = `En ${diffMins} min`;
                    }

                    return {
                        id: itemId,
                        type: 'task',
                        title: isUpcoming ? `⚠️ ¡Vence pronto!` : `Tarea: ${task.title}`,
                        start_time: task.due_date || task.created_at,
                        location: `Prioridad: ${task.priority.toUpperCase()}`,
                        status: isUpcoming ? 'urgente' : 'pendiente',
                        subtitle: isUpcoming ? `Faltan ${diffMins} min: ${task.title}` : timeStatus,
                    };
                });

                // Unificamos y filtramos las que el usuario ya cerró
                const allItems = [...formattedTasks]
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
        // Polling cada 60 segundos para revisar si alguna tarea entró en el rango de 10 min
        const interval = setInterval(fetchData, 60000); 
        return () => clearInterval(interval);

    }, [user, supabase, triggerNativeNotification]);

    const markAsRead = (id: number | string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const storedDismissed = localStorage.getItem(STORAGE_KEY);
        const dismissedIds: (number | string)[] = storedDismissed ? JSON.parse(storedDismissed) : [];
        if (!dismissedIds.includes(id)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissedIds, id]));
        }
    };

    return { notifications, markAsRead, loading, hasNotifications: notifications.length > 0 };
}