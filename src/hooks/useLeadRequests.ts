// src/hooks/useLeadRequests.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Tu hook de autenticación
import type { ClientRequestRow, RequestStatus } from '@/types/requests.types';

export function useLeadRequests(leadId: number) {
  const { supabase } = useAuth();
  const [requests, setRequests] = useState<ClientRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null); // ID de la solicitud que se está actualizando

  // 1. Función para cargar datos
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('datos_solicitados_clientes')
        .select('*')
        .eq('lead_id', leadId)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setRequests(data as ClientRequestRow[] || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId, supabase]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 2. Función para actualizar (Estado y Notas)
  const updateRequest = async (id: number, newStatus: RequestStatus, notes: string) => {
    try {
      setUpdating(id);
      
      const updatePayload: any = {
        estado: newStatus,
        notas_vendedor: notes,
      };

      // Si se marca como resuelto, guardamos la fecha actual
      if (newStatus === 'resuelto') {
        updatePayload.fecha_resolucion =
            new Date().toLocaleString('sv-SE', {
            timeZone: 'America/Guayaquil'
            }).replace(' ', 'T');
        }


      const { error } = await supabase
        .from('datos_solicitados_clientes')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      // Actualizamos el estado local para que se refleje inmediato en pantalla
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, ...updatePayload } : req
      ));
      
      return { success: true };

    } catch (err) {
      console.error('Error updating request:', err);
      return { success: false, error: err };
    } finally {
      setUpdating(null);
    }
  };

  return { requests, loading, updateRequest, updating, refresh: fetchRequests };
}