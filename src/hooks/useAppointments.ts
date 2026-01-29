import { useState, useEffect, useCallback } from 'react';
import { WebAppointmentWithDetails } from '@/types/web-appointments';
import { appointmentService } from '@/services/appointment.service';
import { assignmentEngine } from '@/services/assignmentEngine';

export type WebAppointmentStatus = 'pendiente' | 'aceptado' | 'cancelado' | 'reprogramado' | 'atendido';

export function useAppointments() {
    const [appointments, setAppointments] = useState<WebAppointmentWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAppointments = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Traer todas las citas (Regla 1: No canceladas ya viene del servicio)
            const data = await appointmentService.getWebAppointments();
            
            // 2. Identificar citas que no tienen vendedor asignado (huérfanas)
            const unassigned = data.filter(app => !app.responsible_id && app.status === 'pendiente');
            
            if (unassigned.length > 0) {
                // 3. Procesar asignación automática (Round-Robin o Afinidad)
                for (const app of unassigned) {
                    await assignmentEngine.assignAutomatically(app.id, app.client_user_id);
                }
                
                // 4. Refrescar datos para que cada uno vea lo que le corresponde
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
    }, []);

    /**
     * Actualiza el estado de una cita.
     * Ahora retorna una Promesa para permitir el uso de await en los componentes.
     */
    const updateStatus = async (id: number, status: WebAppointmentStatus) => {
        const result = await appointmentService.updateAppointmentStatus(id, status);
        await loadAppointments();
        return result; 
    };

    /**
     * Ejecuta el motor de asignación manualmente.
     * Retorna el ID del vendedor asignado como Promesa.
     */
    const autoAssign = useCallback(async (id: number, clientId: string) => {
        const sellerId = await assignmentEngine.assignAutomatically(id, clientId);
        await loadAppointments();
        return sellerId;
    }, [loadAppointments]);

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