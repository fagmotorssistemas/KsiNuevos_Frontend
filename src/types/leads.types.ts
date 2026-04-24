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
};

export type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export type DateFilter = 'all' | 'today' | '7days' | '15days' | '30days';

export type LeadsFilters = {
    search: string;
    status: string | 'all';
    temperature: string | 'all';
    dateRange: DateFilter;
    exactDate: string; 
    assignedTo: string | 'all';
    requestStatus?: string | 'all';
    hasBudget?: boolean;
    /** Solo leads con al menos un registro en trade_in_cars */
    hasTradeIn?: boolean;
};