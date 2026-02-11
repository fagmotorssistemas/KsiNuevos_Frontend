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
    // Esto evita que a las 7PM (00:00 UTC) se salte al día siguiente
    return {
        start: `${dateStr}T00:00:00-05:00`,
        end: `${dateStr}T23:59:59-05:00`
    };
};

// --- FETCH PRINCIPAL (GRID & CONTADORES) ---
// Reemplazamos el RPC por una consulta directa para controlar 100% las zonas horarias
export const fetchLeadsAPI = async (supabase: any, page: number, rowsPerPage: number, filters: LeadsFilters) => {
    try {
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        // 1. Construcción de la Query Base
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

        // 2. Aplicar Filtros
        if (filters.search) {
            // Buscamos por nombre o teléfono (ajusta los campos según tu DB real)
            query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
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
                // Para 7, 15, 30 días, calculamos hacia atrás
                const daysBack = parseInt(filters.dateRange.replace('days', '')) || 7;
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - daysBack);
                const pastDateStr = pastDate.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
                // Desde el inicio de hace X días hasta el final de hoy
                query = query.gte('updated_at', `${pastDateStr}T00:00:00-05:00`);
            }
        }

        // 4. Ejecutar Query de Datos
        const { data, count, error } = await query;
        if (error) throw error;

        // 5. Query Secundaria para "Respondidos" (Métrica 1)
        // Calculamos esto por separado para asegurar que el número sea correcto sobre el total filtrado
        // Asumimos que "Respondido" es cualquier estado que NO sea 'nuevo'
        let respondedQuery = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            .neq('status', 'nuevo'); // Criterio de "Respondido"

        // Re-aplicamos los mismos filtros a esta query de conteo
        if (filters.search) respondedQuery = respondedQuery.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        if (filters.status && filters.status !== 'all') respondedQuery = respondedQuery.eq('status', filters.status);
        if (filters.temperature && filters.temperature !== 'all') respondedQuery = respondedQuery.eq('temperature', filters.temperature);
        if (filters.assignedTo && filters.assignedTo !== 'all') respondedQuery = respondedQuery.eq('assigned_to', filters.assignedTo);
        
        // Filtros de fecha para el conteo de respondidos
        if (filters.exactDate) {
            const { start, end } = getEcuadorRange(filters.exactDate);
            respondedQuery = respondedQuery.gte('updated_at', start).lte('updated_at', end);
        } else if (filters.dateRange === 'today') {
            const { start, end } = getEcuadorRange(getEcuadorDateISO());
            respondedQuery = respondedQuery.gte('updated_at', start).lte('updated_at', end);
        }
        // Nota: Omitimos rangos largos en respondedCount para optimizar, o puedes replicarlos si es crítico.

        const { count: respondedCount } = await respondedQuery;

        // 6. Mapeo de Datos
        const mappedData: LeadWithDetails[] = (data || []).map((item: any) => ({
            ...item,
            // Direct query devuelve arrays/objetos, aseguramos compatibilidad
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
export const fetchDailyInteractions = async (supabase: any, assignedTo: string, exactDate: string) => {
    try {
        const targetDateStr = exactDate ? exactDate : getEcuadorDateISO();
        const { start, end } = getEcuadorRange(targetDateStr);

        let query = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            .neq('resume', null)
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