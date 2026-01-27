import type { Database } from "@/types/supabase";

export type LeadWithDetails = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: Database['public']['Tables']['interested_cars']['Row'][];
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
};

// ID que siempre excluyes
export const EXCLUDED_ID = '920fe992-8f4a-4866-a9b6-02f6009fc7b3';