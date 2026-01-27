import { LeadWithDetails, LeadsFilters } from "@/types/leads.types";

export const fetchSellersRequest = async (supabase: any) => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'activo').eq('role', 'vendedor').order('full_name');
    return data || [];
};

// --- FETCH PRINCIPAL (GRID) ---
export const fetchLeadsAPI = async (supabase: any, page: number, rowsPerPage: number, filters: LeadsFilters) => {
    try {
        const { data, error } = await supabase.rpc('get_leads_pager', {
            p_page_number: page,
            p_page_size: rowsPerPage,
            p_search: filters.search || '',
            p_status: filters.status,
            p_temp: filters.temperature,
            p_assigned: filters.assignedTo === 'all' ? null : filters.assignedTo,
            p_resp_mode: 'all',
            p_date_range: filters.dateRange, 
            p_exact_date: filters.exactDate   
        });

        if (error) throw error;

        const totalCount = data && data.length > 0 ? Number(data[0].full_count) : 0;
        const respondedCount = data && data.length > 0 ? Number(data[0].responded_count) : 0;

        const mappedData: LeadWithDetails[] = (data || []).map((item: any) => ({
            ...item,
            interested_cars: item.interested_cars_json || [],
            profiles: item.assigned_profile_json || { full_name: '' }
        }));

        return { data: mappedData, count: totalCount, respondedCount };
    } catch (err) {
        console.error("Error fetchLeadsAPI:", err);
        throw err;
    }
};

// --- GESTIONADOS HOY (LA CORRECCIÓN) ---
export const fetchDailyInteractions = async (supabase: any, assignedTo: string, exactDate: string) => {
    try {
        // 1. Obtener la fecha en formato Ecuador, sin importar la hora de tu PC
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Guayaquil',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Si no hay fecha exacta, usamos "hoy" en Ecuador
        const targetDateStr = exactDate ? exactDate : formatter.format(new Date());

        // 2. EL SECRETO: Añadir "-05:00" al final.
        // Esto le dice a Supabase: "Esta es la hora de Ecuador, conviértela tú a UTC".
        // 00:00 Ecuador -> 05:00 UTC (Esto elimina los leads de anoche que te salían antes)
        const startOfDay = `${targetDateStr}T00:00:00-05:00`;
        const endOfDay = `${targetDateStr}T23:59:59-05:00`;

        let query = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            // Replicamos tu filtro SQL exacto para el resumen
            .neq('resume', null)
            .neq('resume', '') 
            // Usamos las fechas con zona horaria explícita
            .gte('updated_at', startOfDay)
            .lte('updated_at', endOfDay);

        if (assignedTo && assignedTo !== 'all') {
            query = query.eq('assigned_to', assignedTo);
        }

        const { count, error } = await query;
        
        if (error) {
            console.error("Error contando interacciones:", error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error("Error crítico interacciones:", error);
        return 0;
    }
};