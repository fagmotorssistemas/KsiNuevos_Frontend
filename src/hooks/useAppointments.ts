import { useState, useEffect, useCallback, useMemo } from 'react';
import { WebAppointmentWithDetails } from '@/types/web-appointments';
import { appointmentService } from '@/services/appointment.service';
import { assignmentEngine } from '@/services/assignmentEngine';
import { createClient } from '@/lib/supabase/client'; // Importación necesaria para inyectar el cliente

export type WebAppointmentStatus = 'pendiente' | 'aceptado' | 'cancelado' | 'reprogramado' | 'atendido';

export function useAppointments() {
    const [appointments, setAppointments] = useState<WebAppointmentWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Memorizamos el cliente para que no cambie en cada renderizado y evitar loops en useCallback
    const supabase = useMemo(() => createClient(), []);

    const loadAppointments = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Traer todas las citas (Regla 1: No canceladas ya viene del servicio)
            const data = await appointmentService.getWebAppointments();
            
            // 2. Identificar citas que no tienen vendedor asignado (huérfanas)
            const unassigned = data.filter(app => !app.responsible_id && app.status === 'pendiente');
            
            if (unassigned.length > 0) {
                // 3. Procesar asignación automática
                for (const app of unassigned) {
                    // CORRECCIÓN: Se inyecta 'supabase' como primer argumento según requiere la firma de la función
                    await assignmentEngine.assignAutomatically(supabase, app.id, app.client_user_id);
                }
                
                // 4. Refrescar datos para obtener los IDs de responsables actualizados
                const updatedData = await appointmentService.getWebAppointments();
                setAppointments(updatedData);
            } else {
                setAppointments(data);
            }
        } catch (error) {
            console.error("Error en el flujo de citas:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]); // Añadimos supabase a las dependencias del callback

    /**
     * Actualiza el estado de una cita.
     */
    const updateStatus = async (id: number, status: WebAppointmentStatus) => {
        const result = await appointmentService.updateAppointmentStatus(id, status);
        await loadAppointments();
        return result; 
    };

    /**
     * Ejecuta el motor de asignación manualmente.
     */
    const autoAssign = useCallback(async (id: number, clientId: string) => {
        // CORRECCIÓN: Se inyecta 'supabase' como primer argumento
        const sellerId = await assignmentEngine.assignAutomatically(supabase, id, clientId);
        await loadAppointments();
        return sellerId;
    }, [loadAppointments, supabase]); // Añadimos supabase a las dependencias

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    return {
        appointments,
        isLoading,
        refresh: loadAppointments,
        updateStatus,
        autoAssign
    };
}