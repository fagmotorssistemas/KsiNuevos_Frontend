// src/hooks/useLeadRecovery.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { LeadRecoveryRow } from '@/types/recovery.types';

export function useLeadRecovery(leadId: number) {
  const { supabase } = useAuth();
  const [data, setData] = useState<LeadRecoveryRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: recoveryData, error } = await supabase
          .from('lead_recovery')
          .select('*')
          .eq('lead_id', leadId)
          .single();

        if (error && error.code !== 'PGRST116') {
           console.error('Error fetching recovery:', error);
        }

        if (isMounted) {
            // Si no existe fila, data será null (significa que la automatización no ha iniciado)
            setData(recoveryData);
            setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();

    // Opcional: Escuchar cambios en tiempo real (si el bot actualiza, tú lo ves al instante)
    const channel = supabase
      .channel(`recovery_monitor_${leadId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lead_recovery', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          if (isMounted) setData(payload.new as LeadRecoveryRow);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [leadId, supabase]);

  return { recoveryData: data, loading };
}