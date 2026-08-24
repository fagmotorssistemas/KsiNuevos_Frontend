import type { Database } from "@/types/supabase";

type CarRow = Database['public']['Tables']['interested_cars']['Row'];
export type TradeInCarRow = Database['public']['Tables']['trade_in_cars']['Row'];

export type CarRowWithVehicle = CarRow & {
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
    color_preference?: string | null;
};

export type LeadWithDetails = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: CarRowWithVehicle[];
    trade_in_cars?: TradeInCarRow[];
    profiles: { full_name: string } | null;
    /** Temperatura registrada en lead_temperature_history para el mes en curso (Ecuador). */
    month_temperature?: string | null;
};

export type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export type DateFilter = 'all' | 'today' | '7days' | '15days' | 'thisMonth';

export type LeadsFilters = {
    search: string;
    status: string | 'all';
    temperature: string | 'all';
    dateRange: DateFilter;
    /** Día único (métricas / compatibilidad). Se sincroniza cuando inicio = fin. */
    exactDate: string;
    /** YYYY-MM-DD inicio del rango personalizado. */
    dateFrom: string;
    /** YYYY-MM-DD fin del rango personalizado. */
    dateTo: string;
    assignedTo: string | 'all';
    requestStatus?: string | 'all';
    hasBudget?: boolean;
    /** Solo leads con al menos un registro en trade_in_cars */
    hasTradeIn?: boolean;
    /**
     * Solo leads gestionados ese día: resumen con texto y updated_at en el día
     * (updated_at solo cambia al guardar resume).
     */
    onlyInteractions?: boolean;
    /** Solo leads sin resumen ejecutivo (no respondidos). */
    withoutResume?: boolean;
    /** Filtro de solicitud de llamada: pendiente, aplazada o ya llamada. */
    callFilter?: CallFilter;
};

export type CallFilter = "all" | "pendiente" | "aplazada" | "llamado";

export type LeadCallStats = {
    pendiente: number;
    aplazada: number;
    llamado: number;
};

export type LeadCallEventTipo = "solicitud" | "aplazada" | "gestionada";

export type LeadCallEvent = {
    id: string;
    lead_id: number;
    tipo: LeadCallEventTipo;
    razon: string | null;
    programado_hasta: string | null;
    created_at: string;
    lead_name: string;
    created_by_name: string | null;
};

export const CALL_REQUEST_MAX_POSTPONES = 2;

export type LeadCallRequest = {
    id: number;
    name: string;
    phone: string;
    assigned_to: string | null;
    quiere_llamada: boolean | null;
    llamada_posponer_hasta: string | null;
    llamada_posponer_razon: string | null;
    llamada_posponer_veces: number;
};