"use client";

import { useEffect, useState } from "react";
import { LeadAgendaTab } from "@/components/features/leads/Detail/LeadAgendaTab";
import { useAuth } from "@/hooks/useAuth";
import type { LeadWithDetails } from "@/types/leads.types";
import { Loader2 } from "lucide-react";

export function LeadAgendaTabWrapper({ leadId }: { leadId: number }) {
  const { supabase } = useAuth();
  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLead() {
      if (!leadId) return;
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          interested_cars:lead_interested_cars(
             id, lead_id, brand, model, year, price, mileage, inventory_id, created_at,
             inventory(*)
          )
        `)
        .eq('id', leadId)
        .single();
        
      if (!error && data) {
        setLead(data as unknown as LeadWithDetails);
      }
      setIsLoading(false);
    }
    
    fetchLead();
  }, [leadId, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-slate-500">
        No se pudo cargar la información del cliente.
      </div>
    );
  }

  return <LeadAgendaTab lead={lead} />;
}
