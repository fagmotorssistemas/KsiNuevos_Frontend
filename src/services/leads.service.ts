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
                interested_cars(*, inventoryoracle(brand, model, year)),
                profiles:assigned_to(full_name)
            `, { count: 'exact' })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3') // EXCLUDED_ID
            .order('updated_at', { ascending: false })
            .range(from, to);

        let idFilters: number[][] = [];

        // 2. Aplicar Filtros a la Query Principal (nombre, teléfono, vehículo marca/modelo)
        let searchMatchIds: number[] = [];
        if (filters.search) {
            const tokens = searchTokens(filters.search);
            if (tokens.length > 0) {
                // Vehículo: lead_ids con brand o model que contengan TODOS los tokens (kia + st → Kia Stonic)
                const tokenLeadIds = await Promise.all(
                    tokens.map(async (token) => {
                        const { data: newData } = await supabase
                            .from('interested_cars')
                            .select('lead_id, inventoryoracle!inner(brand, model)')
                            .or(`brand.ilike.%${token}%,model.ilike.%${token}%`, { foreignTable: 'inventoryoracle' });

                        const ids = new Set([
                            ...(newData || []).map((x: any) => x.lead_id)
                        ]);
                        return Array.from(ids);
                    })
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

                // ID Kommo: leads donde lead_id_kommo coincida exactamente
                let kommoIds: number[] = [];
                if (tokens.length === 1 && !isNaN(Number(tokens[0]))) {
                    const { data: kommoData } = await supabase
                        .from('leads')
                        .select('id')
                        .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
                        .eq('lead_id_kommo', Number(tokens[0]));
                    kommoIds = ((kommoData as { id: number }[] | null) ?? []).map((r) => r.id);
                }

                searchMatchIds = [...new Set([...nameIds, ...phoneIds, ...vehicleMatchLeadIds, ...kommoIds])];
                if (searchMatchIds.length > 0) {
                    idFilters.push(searchMatchIds);
                } else {
                    idFilters.push([-1]);
                }
            }
        }

        // Sub-filtro de estado de requerimiento (datos pedidos o asesoria financiamiento)
        if (filters.status === 'datos_pedidos' || filters.status === 'asesoria_financiamiento') {
            const table = filters.status === 'datos_pedidos' ? 'datos_solicitados_clientes' : 'asesoria_financiamiento';
            let reqQuery = supabase.from(table).select('lead_id');
            
            if (filters.requestStatus && filters.requestStatus !== 'all') {
                reqQuery = reqQuery.eq('estado', filters.requestStatus);
            }

            const { data: reqData } = await reqQuery;
            const reqIds: number[] = (reqData || []).map((r: any) => r.lead_id as number);
            
            if (reqIds.length > 0) {
                idFilters.push([...new Set<number>(reqIds)]);
            } else {
                idFilters.push([-1]); // No records match this request status
            }
        }

        // Sub-filtro de presupuesto
        if (filters.hasBudget) {
            query = query.not('presupuesto_cliente', 'is', null).gt('presupuesto_cliente', 0);
        }

        // Intersect all idFilters
        if (idFilters.length > 0) {
            let finalIds = idFilters[0];
            for (let i = 1; i < idFilters.length; i++) {
                const set = new Set(idFilters[i]);
                finalIds = finalIds.filter(id => set.has(id));
            }
            if (finalIds.length > 0) {
                query = query.in('id', finalIds);
                searchMatchIds = finalIds; // Update for respondedCount logic later
            } else {
                query = query.eq('id', -1);
                searchMatchIds = [];
            }
        }

        if (filters.status && filters.status !== 'all' && filters.status !== 'datos_pedidos' && filters.status !== 'asesoria_financiamiento') {
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
        if (idFilters.length > 0) {
            if (searchMatchIds.length > 0) {
                respondedQuery = respondedQuery.in('id', searchMatchIds);
            } else {
                respondedQuery = respondedQuery.eq('id', -1);
            }
        }
        if (filters.hasBudget) {
            respondedQuery = respondedQuery.not('presupuesto_cliente', 'is', null).gt('presupuesto_cliente', 0);
        }
        if (filters.status && filters.status !== 'all' && filters.status !== 'datos_pedidos' && filters.status !== 'asesoria_financiamiento') {
            respondedQuery = respondedQuery.eq('status', filters.status);
        }
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
            interested_cars: (item.interested_cars || []).map((c: any) => ({
                ...c,
                brand: c.inventoryoracle?.brand || c.brand,
                model: c.inventoryoracle?.model || c.model,
                year: c.inventoryoracle?.year || c.year,
            })),
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

// --- ALERTAS DE PENDIENTES ---
export const fetchRequestStats = async (supabase: any, assignedTo: string) => {
    try {
        let datosQuery = supabase
            .from('datos_solicitados_clientes')
            .select('estado, lead_id, leads!inner(assigned_to)')
            .neq('leads.assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3');

        if (assignedTo && assignedTo !== 'all') {
            datosQuery = datosQuery.eq('leads.assigned_to', assignedTo);
        }

        let asesoriaQuery = supabase
            .from('asesoria_financiamiento')
            .select('estado, lead_id, leads!inner(assigned_to)')
            .neq('leads.assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3');

        if (assignedTo && assignedTo !== 'all') {
            asesoriaQuery = asesoriaQuery.eq('leads.assigned_to', assignedTo);
        }

        const [datosRes, asesoriaRes] = await Promise.all([datosQuery, asesoriaQuery]);

        // Función para contar LEADS ÚNICOS por estado
        const processStats = (data: any[]) => {
            const stats = { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 };
            if (!data) return stats;

            const leadsByState = {
                pendiente: new Set(),
                en_proceso: new Set(),
                resuelto: new Set(),
                all: new Set()
            };

            data.forEach(item => {
                const est = item.estado || 'pendiente';
                leadsByState.all.add(item.lead_id);
                if (est === 'pendiente') leadsByState.pendiente.add(item.lead_id);
                if (est === 'en_proceso') leadsByState.en_proceso.add(item.lead_id);
                if (est === 'resuelto') leadsByState.resuelto.add(item.lead_id);
            });

            stats.pendiente = leadsByState.pendiente.size;
            stats.en_proceso = leadsByState.en_proceso.size;
            stats.resuelto = leadsByState.resuelto.size;
            stats.total = leadsByState.all.size;

            return stats;
        };

        return {
            datosPedidos: processStats(datosRes.data),
            asesoria: processStats(asesoriaRes.data)
        };
    } catch (error) {
        console.error("Error fetching request stats:", error);
        return { 
            datosPedidos: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 }, 
            asesoria: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 } 
        };
    }
};

// --- ALERTAS DE PRESUPUESTO ---
export const fetchBudgetStats = async (supabase: any, assignedTo: string) => {
    try {
        let query = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .neq('assigned_to', '920fe992-8f4a-4866-a9b6-02f6009fc7b3')
            .not('presupuesto_cliente', 'is', null)
            .gt('presupuesto_cliente', 0); // Opcional: solo mayores a 0 si consideran 0 como sin presupuesto, o quitar si solo not null

        if (assignedTo && assignedTo !== 'all') {
            query = query.eq('assigned_to', assignedTo);
        }

        const { count, error } = await query;
        if (error) return 0;
        return count || 0;
    } catch (error) {
        console.error("Error fetching budget stats:", error);
        return 0;
    }
};