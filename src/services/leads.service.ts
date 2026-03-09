import { LeadWithDetails, LeadsFilters } from "@/types/leads.types";

export const fetchSellersRequest = async (supabase: any) => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'activo').eq('role', 'vendedor').order('full_name');
    return data || [];
};

// --- HELPER PARA FECHAS ECUADOR ---
const getEcuadorDateISO = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
};

const getEcuadorRange = (dateStr: string) => {
    // Genera el rango exacto para el día en Ecuador, forzando el offset -05:00
    return {
        start: `${dateStr}T00:00:00-05:00`,
        end: `${dateStr}T23:59:59-05:00`
    };
};

// Tokens de búsqueda (sin espacios) para evitar que el filtro se rompa; "kia st" → ["kia", "st"]
const searchTokens = (search: string) => search.trim().split(/\s+/).filter(Boolean);

// --- FETCH PRINCIPAL (GRID & CONTADORES) ---
export const fetchLeadsAPI = async (supabase: any, page: number, rowsPerPage: number, filters: LeadsFilters) => {
    try {
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        // 1. Construcción de la Query Base (DATOS)
        let query = supabase
            .from('leads')
            .select(`
                *,
                interested_cars(*),
                profiles:assigned_to(full_name)
            `, { count: 'exact' })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3') // EXCLUDED_ID
            .order('updated_at', { ascending: false })
            .range(from, to);

        // 2. Aplicar Filtros a la Query Principal (nombre, teléfono, vehículo marca/modelo)
        let searchMatchIds: number[] = [];
        if (filters.search) {
            const tokens = searchTokens(filters.search);
            if (tokens.length > 0) {
                // Vehículo: lead_ids con brand o model que contengan TODOS los tokens (kia + st → Kia Stonic)
                const tokenLeadIds = await Promise.all(
                    tokens.map((token) =>
                        supabase
                            .from('interested_cars')
                            .select('lead_id')
                            .or(`brand.ilike.%${token}%,model.ilike.%${token}%`)
                            .then((r: { data: { lead_id: number }[] | null }) => (r.data ?? []).map((x) => x.lead_id))
                    )
                ) as number[][];
                const vehicleSets = tokenLeadIds.map((ids) => new Set(ids));
                const vehicleMatchLeadIds = vehicleSets.length === 1
                    ? [...vehicleSets[0]]
                    : [...vehicleSets[0]].filter((id) => vehicleSets.every((set) => set.has(id)));

                // Nombre: leads donde name contiene TODOS los tokens (AND)
                let nameIds: number[] = [];
                let qName = supabase.from('leads').select('id').neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3');
                for (const t of tokens) qName = qName.ilike('name', `%${t}%`);
                const { data: nameData } = await qName;
                nameIds = ((nameData as { id: number }[] | null) ?? []).map((r) => r.id);

                // Teléfono: leads donde phone contiene TODOS los tokens (AND)
                let phoneIds: number[] = [];
                let qPhone = supabase.from('leads').select('id').neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3');
                for (const t of tokens) qPhone = qPhone.ilike('phone', `%${t}%`);
                const { data: phoneData } = await qPhone;
                phoneIds = ((phoneData as { id: number }[] | null) ?? []).map((r) => r.id);

                searchMatchIds = [...new Set([...nameIds, ...phoneIds, ...vehicleMatchLeadIds])];
                if (searchMatchIds.length > 0) {
                    query = query.in('id', searchMatchIds);
                } else {
                    // Ningún lead coincide → forzar resultado vacío
                    query = query.eq('id', -1);
                }
            }
        }
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters.temperature && filters.temperature !== 'all') {
            query = query.eq('temperature', filters.temperature);
        }
        if (filters.assignedTo && filters.assignedTo !== 'all') {
            query = query.eq('assigned_to', filters.assignedTo);
        }

        // 3. Lógica de Fechas (CORRECCIÓN ZONA HORARIA)
        if (filters.exactDate) {
            const { start, end } = getEcuadorRange(filters.exactDate);
            query = query.gte('updated_at', start).lte('updated_at', end);
        } else if (filters.dateRange !== 'all') {
            const today = getEcuadorDateISO();
            
            if (filters.dateRange === 'today') {
                const { start, end } = getEcuadorRange(today);
                query = query.gte('updated_at', start).lte('updated_at', end);
            } else {
                const daysBack = parseInt(filters.dateRange.replace('days', '')) || 7;
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - daysBack);
                const pastDateStr = pastDate.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
                query = query.gte('updated_at', `${pastDateStr}T00:00:00-05:00`);
            }
        }

        // 4. Ejecutar Query de Datos
        const { data, count, error } = await query;
        if (error) throw error;

        // 5. Query Secundaria para "Respondidos" (Métrica 1)
        // CORRECCIÓN: Ahora contamos como respondido si 'resume' NO es nulo y NO está vacío.
        let respondedQuery = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            .not('resume', 'is', null) // Que no sea NULL
            .neq('resume', '');        // Que no esté vacío

        // Re-aplicamos los mismos filtros para que el porcentaje sea sobre lo que el usuario ve
        if (filters.search && searchMatchIds.length > 0) {
            respondedQuery = respondedQuery.in('id', searchMatchIds);
        } else if (filters.search && searchMatchIds.length === 0) {
            respondedQuery = respondedQuery.eq('id', -1);
        }
        if (filters.status && filters.status !== 'all') respondedQuery = respondedQuery.eq('status', filters.status);
        if (filters.temperature && filters.temperature !== 'all') respondedQuery = respondedQuery.eq('temperature', filters.temperature);
        if (filters.assignedTo && filters.assignedTo !== 'all') respondedQuery = respondedQuery.eq('assigned_to', filters.assignedTo);
        
        // Filtros de fecha para el conteo de respondidos (AQUÍ ESTABA EL ERROR - ARREGLADO)
        if (filters.exactDate) {
            const { start, end } = getEcuadorRange(filters.exactDate);
            respondedQuery = respondedQuery.gte('updated_at', start).lte('updated_at', end);
        } else if (filters.dateRange !== 'all') {
            const today = getEcuadorDateISO();
            
            if (filters.dateRange === 'today') {
                const { start, end } = getEcuadorRange(today);
                respondedQuery = respondedQuery.gte('updated_at', start).lte('updated_at', end);
            } else {
                // Faltaba esta lógica en la query de respondidos para 7days, 15days, 30days
                const daysBack = parseInt(filters.dateRange.replace('days', '')) || 7;
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - daysBack);
                const pastDateStr = pastDate.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
                respondedQuery = respondedQuery.gte('updated_at', `${pastDateStr}T00:00:00-05:00`);
            }
        }

        const { count: respondedCount } = await respondedQuery;

        // 6. Mapeo de Datos
        const mappedData: LeadWithDetails[] = (data || []).map((item: any) => ({
            ...item,
            interested_cars: item.interested_cars || [],
            profiles: item.profiles || { full_name: '' }
        }));

        return { 
            data: mappedData, 
            count: count || 0, 
            respondedCount: respondedCount || 0 
        };

    } catch (err) {
        console.error("Error fetchLeadsAPI:", err);
        throw err;
    }
};

// --- GESTIONADOS HOY (Métrica 2) ---
// Esta query ya estaba correcta usando el campo 'resume', la mantenemos igual.
export const fetchDailyInteractions = async (supabase: any, assignedTo: string, exactDate: string) => {
    try {
        const targetDateStr = exactDate ? exactDate : getEcuadorDateISO();
        const { start, end } = getEcuadorRange(targetDateStr);

        let query = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            .not('resume', 'is', null)
            .neq('resume', '') 
            .gte('updated_at', start)
            .lte('updated_at', end);

        if (assignedTo && assignedTo !== 'all') {
            query = query.eq('assigned_to', assignedTo);
        }

        const { count, error } = await query;
        if (error) return 0;
        return count || 0;
    } catch (error) {
        return 0;
    }
};