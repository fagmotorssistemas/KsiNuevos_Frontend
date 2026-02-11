import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationItem {
    id: number | string;
    type: 'suggestion' | 'task';
    title: string;
    start_time: string;
    location: string;
    status: 'urgent' | 'pending' | 'bot_urgent' | 'bot_info';
    subtitle: string;
    lead_id?: number | null;
}

export function useNotifications() {
    const { supabase, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const STORAGE_KEY = 'dismissed_notifications_v7';

    // --- 1. LÓGICA DE DESBLOQUEO DE AUDIO (Fix Autoplay) ---
    useEffect(() => {
        const unlockAudio = () => {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.01; // Casi mudo
            
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
                console.log("🔊 Sistema de audio desbloqueado.");
            }).catch(() => {
                console.log("Esperando interacción para audio...");
            });
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    // --- 2. INICIALIZAR REPRODUCTOR ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            audioRef.current = new Audio('/sounds/notification.mp3');
            audioRef.current.loop = true; // Que repita hasta que le den click
        }
    }, []);

    const stopSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const playSound = () => {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => console.log("Interacción requerida para audio"));
        }
    };

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            const storedDismissed = localStorage.getItem(STORAGE_KEY);
            const dismissedIds: string[] = storedDismissed ? JSON.parse(storedDismissed) : [];
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const pastLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const [tasksRes, leadsRes] = await Promise.all([
                // TAREAS
                supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_completed', false)
                    .gte('created_at', pastLimit.toISOString()),
                
                // LEADS (Sugerencias)
                supabase
                    .from('leads')
                    .select('*')
                    .eq('assigned_to', user.id)
                    .or('day_detected.not.is.null,time_reference.not.is.null')
            ]);

            let shouldAlert = false;

            // --- PROCESAR TAREAS ---
            const taskItems: NotificationItem[] = (tasksRes.data || []).map(task => {
                const effectiveDateStr = task.due_date || task.created_at || new Date().toISOString();
                const effectiveDate = new Date(effectiveDateStr);
                const diffMins = Math.round((effectiveDate.getTime() - now.getTime()) / 60000);
                
                // Tareas: Urgente si faltan 10 mins
                const isUrgent = diffMins <= 10 && diffMins > -60; 
                const itemId = `task-${task.id}`;

                if (isUrgent && !dismissedIds.includes(itemId)) shouldAlert = true;

                return {
                    id: itemId,
                    type: 'task',
                    title: task.title,
                    start_time: effectiveDateStr,
                    location: `Prioridad: ${task.priority || 'Normal'}`,
                    status: isUrgent ? 'urgent' : 'pending',
                    subtitle: isUrgent ? `⚠️ Vence en ${diffMins} min` : 'Pendiente',
                };
            });

            // --- PROCESAR SUGERENCIAS (LEADS) ---
            const suggestionItems: NotificationItem[] = (leadsRes.data || [])
                .filter(lead => {
                    if (!lead.day_detected) return false;
                    const parts = lead.day_detected.split('-');
                    const leadTs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
                    return leadTs <= startOfToday; // Solo mostrar si es hoy o pasado (no futuro lejano)
                })
                .map(lead => {
                    const itemId = `sug-${lead.id}`;
                    
                    // Armar fecha completa string
                    let finalDateStr = lead.day_detected!; 
                    if (lead.time_reference && lead.time_reference.length > 5) {
                        finalDateStr = lead.time_reference; 
                    } else if (lead.day_detected && lead.hour_detected) {
                        finalDateStr = `${lead.day_detected}T${lead.hour_detected}`;
                    }

                    // Cálculos de fecha y hora
                    const parts = lead.day_detected!.split('-');
                    const leadTs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
                    const isToday = leadTs === startOfToday;

                    const hasTime = (lead.hour_detected && lead.hour_detected.length > 0) || 
                                    (lead.time_reference && lead.time_reference.includes('T'));

                    let status: 'bot_urgent' | 'bot_info' = 'bot_info';

                    // --- AQUÍ ESTÁ EL CAMBIO SOLICITADO ---
                    if (isToday && hasTime) {
                        // 1. VISUAL: Siempre "bot_urgent" (rojo) si es hoy y tiene hora.
                        status = 'bot_urgent';

                        // 2. SONIDO: Calculamos si faltan 30 minutos o menos
                        const eventTime = new Date(finalDateStr).getTime();
                        const currentTime = new Date().getTime();
                        const minutesUntil = (eventTime - currentTime) / 60000;

                        // Condición de sonido: Faltan entre 0 y 30 minutos
                        const isWithin30Minutes = minutesUntil > 0 && minutesUntil <= 30;

                        // Solo activar sonido si estamos en el rango de 30 mins
                        if (isWithin30Minutes && !dismissedIds.includes(itemId)) {
                            shouldAlert = true;
                        }
                    }

                    return {
                        id: itemId,
                        type: 'suggestion',
                        title: `Posible Visita: ${lead.name}`,
                        start_time: finalDateStr,
                        location: 'IA Detectó Disponibilidad',
                        status: status,
                        subtitle: 'Cliente disponible', 
                        lead_id: lead.id
                    };
                });

            // Ordenar y guardar
            const finalList = [...taskItems, ...suggestionItems]
                .filter(item => !dismissedIds.includes(String(item.id)))
                .sort((a, b) => {
                    const scoreA = (a.status === 'urgent' || a.status === 'bot_urgent') ? 0 : 1;
                    const scoreB = (b.status === 'urgent' || b.status === 'bot_urgent') ? 0 : 1;
                    return scoreA - scoreB || new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                });

            setNotifications(finalList);

            // CONTROL DEL REPRODUCTOR
            if (shouldAlert && finalList.length > 0) {
                playSound();
            } else {
                stopSound();
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Revisar cada 30 segundos
        return () => clearInterval(interval);
    }, [fetchData]);

    const markAsRead = (id: number | string) => {
        const storedDismissed = localStorage.getItem(STORAGE_KEY);
        const dismissedIds: string[] = storedDismissed ? JSON.parse(storedDismissed) : [];
        if (!dismissedIds.includes(String(id))) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissedIds, String(id)]));
        }

        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            // Verificar si queda algo urgente sonando antes de apagar
            const stillHasSoundAlert = updated.some(n => {
                 // Aquí tendríamos que recalcular si está en rango de 30 mins, 
                 // pero por seguridad apagamos si ya no hay urgentes visuales
                 return n.status === 'urgent' || n.status === 'bot_urgent'; 
            });
            
            // Si el usuario cierra la alerta que suena, apagamos el sonido
            stopSound(); 
            return updated;
        });
    };

    return { notifications, markAsRead, loading, hasNotifications: notifications.length > 0 };
}