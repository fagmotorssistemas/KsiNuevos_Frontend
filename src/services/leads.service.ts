import { LeadWithDetails, LeadsFilters, TradeInCarRow } from "@/types/leads.types";

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

/** Filtro de listado por ingreso del lead (alineado a reporte diario / métricas). */
const applyLeadsCreatedInRange = (query: any, start: string, end: string) =>
    query.gte('created_at', start).lte('created_at', end);

/** Primer día del mes calendario actual en Ecuador (YYYY-MM-01). */
export const getEcuadorMonthStartISO = () => {
    const today = getEcuadorDateISO();
    return `${today.slice(0, 7)}-01`;
};

/** Suma días a una fecha YYYY-MM-DD (calendario, sin depender del huso del navegador). */
const addDaysToYmd = (ymd: string, deltaDays: number): string => {
    const [y, m, d] = ymd.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    utc.setUTCDate(utc.getUTCDate() + deltaDays);
    return utc.toISOString().slice(0, 10);
};

type LeadsTemperatureHistoryScope =
    | { mode: 'all' }
    | { mode: 'month'; campaignMonth: string };

/**
 * Alcance del historial de temperatura (independiente del ingreso created_at).
 * - Todo el tiempo / últimos N días / hoy → cualquier mes en historial.
 * - Este mes / fecha exacta → mes calendario Ecuador de referencia.
 */
const getTemperatureHistoryScope = (filters: LeadsFilters): LeadsTemperatureHistoryScope => {
    if (filters.exactDate) {
        return { mode: 'month', campaignMonth: `${filters.exactDate.slice(0, 7)}-01` };
    }
    if (filters.dateRange === 'all') {
        return { mode: 'all' };
    }
    if (filters.dateRange === 'thisMonth') {
        return { mode: 'month', campaignMonth: getEcuadorMonthStartISO() };
    }
    return { mode: 'all' };
};

/** Rango de ingreso del lead (created_at, Ecuador). Null = sin filtro por fecha de ingreso. */
const getLeadsCreatedAtRangeFromFilters = (
    filters: LeadsFilters
): { start: string; end: string } | null => {
    if (filters.onlyInteractions) return null;
    if (filters.exactDate) {
        return getEcuadorRange(filters.exactDate);
    }
    if (filters.dateRange === 'all') return null;

    const today = getEcuadorDateISO();
    if (filters.dateRange === 'today') {
        return getEcuadorRange(today);
    }
    if (filters.dateRange === 'thisMonth') {
        return {
            start: `${getEcuadorMonthStartISO()}T00:00:00-05:00`,
            end: getEcuadorRange(today).end,
        };
    }
    const daysBack = parseInt(filters.dateRange.replace('days', ''), 10) || 7;
    const startYmd = addDaysToYmd(today, -daysBack);
    return {
        start: `${startYmd}T00:00:00-05:00`,
        end: getEcuadorRange(today).end,
    };
};

const applyLeadsCreatedAtRangeFromFilters = (query: any, filters: LeadsFilters) => {
    const range = getLeadsCreatedAtRangeFromFilters(filters);
    if (!range) return query;
    return applyLeadsCreatedInRange(query, range.start, range.end);
};

const isLeadsTemperatureFilterActive = (filters: LeadsFilters) =>
    Boolean(filters.temperature && filters.temperature !== 'all');

/** PostgREST limita tamaño de `in.(...)` en URL; trocear si hay muchos IDs. */
const LEAD_ID_IN_CHUNK = 400;

type LeadTemperatureFilter = Exclude<LeadsFilters['temperature'], 'all'>;

type ResolvedTemperatureFilter =
    | { mode: 'include'; ids: number[] }
    | { mode: 'exclude'; ids: number[] }
    | { mode: 'none' };

const applyLeadIdInFilter = (query: any, ids: number[]) => {
    if (ids.length === 0) return query.eq('id', -1);
    if (ids.length <= LEAD_ID_IN_CHUNK) return query.in('id', ids);
    const parts: string[] = [];
    for (let i = 0; i < ids.length; i += LEAD_ID_IN_CHUNK) {
        parts.push(`id.in.(${ids.slice(i, i + LEAD_ID_IN_CHUNK).join(',')})`);
    }
    return query.or(parts.join(','));
};

const applyLeadIdNotInFilter = (query: any, ids: number[]) => {
    if (ids.length === 0) return query;
    if (ids.length <= LEAD_ID_IN_CHUNK) return query.not('id', 'in', `(${ids.join(',')})`);
    let q = query;
    for (let i = 0; i < ids.length; i += LEAD_ID_IN_CHUNK) {
        const chunk = ids.slice(i, i + LEAD_ID_IN_CHUNK);
        q = q.not('id', 'in', `(${chunk.join(',')})`);
    }
    return q;
};

const applyResolvedTemperatureFilter = (query: any, resolved: ResolvedTemperatureFilter) => {
    if (resolved.mode === 'none') return query;
    if (resolved.mode === 'include') {
        if (resolved.ids.length === 1 && resolved.ids[0] === -1) return query.eq('id', -1);
        return applyLeadIdInFilter(query, resolved.ids);
    }
    return applyLeadIdNotInFilter(query, resolved.ids);
};

/** Filtro de temperatura en Postgres (índice + DISTINCT ON). Requiere migración lead_ids_for_temperature_filter. */
const fetchLeadIdsForTemperature = async (
    supabase: any,
    temperature: LeadTemperatureFilter,
    scope: LeadsTemperatureHistoryScope
): Promise<number[]> => {
    const { data, error } = await supabase.rpc('lead_ids_for_temperature_filter', {
        p_temperature: temperature,
        p_campaign_month: scope.mode === 'month' ? scope.campaignMonth : null,
    });

    if (error) {
        console.warn('lead_ids_for_temperature_filter:', error.message || error);
        return [];
    }

    return (data ?? [])
        .map((row: { lead_id?: number | string }) => Number(row.lead_id))
        .filter((id) => Number.isInteger(id) && id > 0);
};

type BoardFilterRpcExtras = {
    assignedTo?: string;
    status?: string;
    hasBudget?: boolean;
};

const boardFilterRpcParams = (
    extras?: BoardFilterRpcExtras,
    skipStats = false,
    createdRange?: { start: string; end: string } | null
) => {
    const params: Record<string, unknown> = {
        p_limit: 10,
        p_offset: 0,
        p_has_budget: Boolean(extras?.hasBudget),
        p_skip_stats: skipStats,
    };
    if (createdRange) {
        params.p_created_from = createdRange.start;
        params.p_created_to = createdRange.end;
    }
    if (extras?.assignedTo && extras.assignedTo !== 'all') {
        params.p_assigned_to = extras.assignedTo;
    }
    if (
        extras?.status &&
        extras.status !== 'all' &&
        extras.status !== 'datos_pedidos' &&
        extras.status !== 'asesoria_financiamiento'
    ) {
        params.p_status = extras.status;
    }
    return params;
};

const temperatureFilterRpcParams = (
    temperature: LeadTemperatureFilter,
    scope: LeadsTemperatureHistoryScope,
    extras?: BoardFilterRpcExtras,
    skipStats = false,
    createdRange?: { start: string; end: string } | null
) => {
    const params: Record<string, unknown> = {
        ...boardFilterRpcParams(extras, skipStats, createdRange),
        p_temperature: temperature,
    };
    if (scope.mode === 'month') {
        params.p_campaign_month = scope.campaignMonth;
    }
    return params;
};

const isBoardFastPathEligible = (filters: LeadsFilters) =>
    !filters.search?.trim() &&
    !filters.hasTradeIn &&
    !filters.onlyInteractions &&
    filters.status !== 'datos_pedidos' &&
    filters.status !== 'asesoria_financiamiento';

/** Temp activa + filtros simples (fecha de ingreso vía RPC). */
const isTemperatureOnlyLeadsFilter = (filters: LeadsFilters) =>
    isLeadsTemperatureFilterActive(filters) && isBoardFastPathEligible(filters);

/** Sin temperatura pero con filtro de ingreso (hoy, 7/15 días, este mes, fecha exacta). */
const isDateFilteredLeadsBoardFastPath = (filters: LeadsFilters) =>
    !isLeadsTemperatureFilterActive(filters) &&
    isBoardFastPathEligible(filters) &&
    getLeadsCreatedAtRangeFromFilters(filters) != null;

export type FetchLeadsAPIOptions = {
    /** En página 2+ evita recomputar COUNT en BD. */
    cachedTotal?: number;
    cachedResponded?: number;
};

const LEADS_SELECT_WITH_RELATIONS = `
    *,
    interested_cars(*, inventoryoracle(brand, model, year)),
    profiles:assigned_to(full_name)
`;

const mapLeadsPageRows = (
    rawLeads: any[],
    tradeInByLeadPk: Map<number, unknown[]>,
    monthTempByLead: Map<number, string>
): LeadWithDetails[] =>
    rawLeads.map((item: any) => {
        const pk = Number(item.id);
        const tradeRows = tradeInByLeadPk.get(pk);
        const scopedTemp = monthTempByLead.get(pk);
        return {
            ...item,
            month_temperature: scopedTemp ?? item.temperature ?? null,
            interested_cars: (item.interested_cars || []).map((c: any) => ({
                ...c,
                brand: c.inventoryoracle?.brand || c.brand,
                model: c.inventoryoracle?.model || c.model,
                year: c.inventoryoracle?.year || c.year,
            })),
            trade_in_cars: dedupeTradeInRows(tradeRows || []) as TradeInCarRow[],
            profiles: item.profiles || { full_name: "" },
        };
    });

type BoardPagePayload = {
    total?: number | string;
    responded?: number | string;
    rows?: LeadWithDetails[];
};

const mapBoardPagePayload = (
    payload: BoardPagePayload,
    cache?: Pick<FetchLeadsAPIOptions, 'cachedTotal' | 'cachedResponded'>,
    monthTemperature?: LeadTemperatureFilter
): { data: LeadWithDetails[]; count: number; respondedCount: number } => {
    const totalCount =
        payload.total != null ? Number(payload.total) : Number(cache?.cachedTotal ?? 0);
    const respondedCount =
        payload.responded != null
            ? Number(payload.responded)
            : Number(cache?.cachedResponded ?? 0);
    const rows = (payload.rows ?? []) as LeadWithDetails[];

    const data = rows.map((row) => ({
        ...row,
        month_temperature: monthTemperature ?? row.month_temperature ?? row.temperature ?? null,
        interested_cars: row.interested_cars ?? [],
        trade_in_cars: row.trade_in_cars ?? [],
        profiles: row.profiles ?? { full_name: "" },
    }));

    return { data, count: totalCount, respondedCount };
};

/** Filtro de ingreso (sin temperatura): 1 RPC paginado. */
const fetchLeadsDateBoardFastPath = async (
    supabase: any,
    page: number,
    rowsPerPage: number,
    filters: LeadsFilters,
    cache?: Pick<FetchLeadsAPIOptions, 'cachedTotal' | 'cachedResponded'>
) => {
    const from = (page - 1) * rowsPerPage;
    const createdRange = getLeadsCreatedAtRangeFromFilters(filters);
    const rpcExtras: BoardFilterRpcExtras = {
        assignedTo: filters.assignedTo,
        status: filters.status,
        hasBudget: filters.hasBudget,
    };
    const skipStats =
        page > 1 && cache?.cachedTotal != null && cache.cachedTotal >= 0;

    const rpcParams = boardFilterRpcParams(rpcExtras, skipStats, createdRange);
    rpcParams.p_limit = rowsPerPage;
    rpcParams.p_offset = from;

    const { data: payloadRaw, error } = await supabase.rpc('fetch_leads_board_page', rpcParams);

    if (error) {
        console.error('[leads] fetch_leads_board_page:', error.message || error);
        throw error;
    }

    return mapBoardPagePayload((payloadRaw ?? {}) as BoardPagePayload, cache);
};

/**
 * Filtro solo temperatura: 1 RPC en Postgres (conteo + página de 10 filas con relaciones).
 * Sin descargar listas de IDs ni segunda petición PostgREST con embeds.
 */
const fetchLeadsTemperatureFastPath = async (
    supabase: any,
    page: number,
    rowsPerPage: number,
    filters: LeadsFilters,
    scope: LeadsTemperatureHistoryScope,
    cache?: Pick<FetchLeadsAPIOptions, 'cachedTotal' | 'cachedResponded'>
) => {
    const from = (page - 1) * rowsPerPage;
    const temperature = filters.temperature as LeadTemperatureFilter;
    const rpcExtras: BoardFilterRpcExtras = {
        assignedTo: filters.assignedTo,
        status: filters.status,
        hasBudget: filters.hasBudget,
    };
    const createdRange = getLeadsCreatedAtRangeFromFilters(filters);
    const skipStats =
        page > 1 &&
        cache?.cachedTotal != null &&
        cache.cachedTotal >= 0 &&
        !createdRange;

    const rpcParams = temperatureFilterRpcParams(
        temperature,
        scope,
        rpcExtras,
        skipStats,
        createdRange
    );
    rpcParams.p_limit = rowsPerPage;
    rpcParams.p_offset = from;

    const { data: payloadRaw, error } = await supabase.rpc(
        'fetch_leads_board_temperature_page',
        rpcParams
    );

    if (error) {
        console.error('[leads] fetch_leads_board_temperature_page:', error.message || error);
        return null;
    }

    return mapBoardPagePayload(
        (payloadRaw ?? {}) as BoardPagePayload,
        cache,
        temperature
    );
};

/**
 * Ruta lenta (búsqueda + temperatura, etc.): frío excluye caliente/tibio; resto incluye IDs.
 */
const resolveTemperatureFilter = async (
    supabase: any,
    temperature: LeadTemperatureFilter,
    scope: LeadsTemperatureHistoryScope
): Promise<ResolvedTemperatureFilter> => {
    if (temperature === 'frio') {
        const [calienteIds, tibioIds] = await Promise.all([
            fetchLeadIdsForTemperature(supabase, 'caliente', scope),
            fetchLeadIdsForTemperature(supabase, 'tibio', scope),
        ]);
        const excludeIds = [...new Set([...calienteIds, ...tibioIds])];
        if (excludeIds.length === 0) {
            return { mode: 'none' };
        }
        return { mode: 'exclude', ids: excludeIds };
    }

    const includeIds = await fetchLeadIdsForTemperature(supabase, temperature, scope);
    if (includeIds.length === 0) {
        return { mode: 'include', ids: [-1] };
    }
    return { mode: 'include', ids: includeIds };
};

/** Temperatura en columna Temp (página actual). */
const fetchEffectiveTemperatureForLeads = async (
    supabase: any,
    leadIds: number[],
    scope: LeadsTemperatureHistoryScope,
    activeFilterTemperature?: LeadTemperatureFilter
): Promise<Map<number, string>> => {
    const map = new Map<number, string>();
    if (leadIds.length === 0) return map;

    if (scope.mode === 'all' && activeFilterTemperature) {
        const { data, error } = await supabase
            .from('lead_temperature_history')
            .select('lead_id')
            .in('lead_id', leadIds)
            .eq('temperature', activeFilterTemperature);

        if (!error) {
            for (const row of data ?? []) {
                const id = Number((row as { lead_id?: number }).lead_id);
                if (id) map.set(id, activeFilterTemperature);
            }
        }
        return map;
    }

    if (scope.mode === 'month') {
        const { data, error } = await supabase
            .from('lead_temperature_history')
            .select('lead_id, temperature')
            .eq('campaign_month', scope.campaignMonth)
            .in('lead_id', leadIds);

        if (!error) {
            for (const row of data ?? []) {
                const id = Number((row as { lead_id?: number }).lead_id);
                const temp = String((row as { temperature?: string }).temperature ?? '');
                if (id && temp) map.set(id, temp);
            }
        }
        return map;
    }

    return map;
};

/**
 * Gestión del día = resumen con texto y updated_at en el rango.
 * En BD, updated_at solo se mueve al guardar resume (trigger set_updated_at).
 */
const fetchLeadIdsGestionadosInRange = async (
    supabase: any,
    start: string,
    end: string,
    assignedTo?: string
): Promise<number[]> => {
    let query = supabase
        .from('leads')
        .select('id')
        .not('resume', 'is', null)
        .neq('resume', '')
        .gte('updated_at', start)
        .lte('updated_at', end);

    if (assignedTo && assignedTo !== 'all') {
        query = query.eq('assigned_to', assignedTo);
    }

    const { data, error } = await query;
    if (error) {
        console.warn('fetchLeadIdsGestionadosInRange:', error.message || error);
        return [];
    }
    return (data ?? []).map((r: { id: number }) => Number(r.id));
};

// Tokens de búsqueda (sin espacios) para evitar que el filtro se rompa; "kia st" → ["kia", "st"]
const searchTokens = (search: string) => search.trim().split(/\s+/).filter(Boolean);

/** Una fila por id de trade_in_cars, orden estable */
const dedupeTradeInRows = (rows: unknown[]): unknown[] => {
    const m = new Map<number, unknown>();
    for (const r of rows) {
        const row = r as { id?: number };
        if (row?.id != null) m.set(Number(row.id), r);
    }
    return [...m.values()];
};

/**
 * Carga trade_in_cars para los leads de la página.
 * 1) Por relación canónica trade_in_cars.lead_id = leads.id
 * 2) Si no hay filas, intenta cuando en BD se guardó lead_id_kommo por error en lead_id
 * (el embed en select a veces viene vacío por RLS o caché de relación en PostgREST).
 */
const parseLeadPk = (raw: unknown): number | null => {
    if (raw == null) return null;
    const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
};

const fetchTradeInCarsForLeadPage = async (supabase: any, rawLeads: any[]) => {
    const tradeInByLeadPk = new Map<number, unknown[]>();

    const leadPks = [
        ...new Set(
            rawLeads.map((r) => parseLeadPk(r?.id)).filter((n): n is number => n != null)
        ),
    ];

    if (leadPks.length === 0) {
        return tradeInByLeadPk;
    }

    try {
        if (leadPks.length > 0) {
            const { data: byInternalId, error: err1 } = await supabase
                .from("trade_in_cars")
                .select("*")
                .in("lead_id", leadPks);

            if (!err1) {
                for (const row of byInternalId || []) {
                    const lid = Number((row as { lead_id: number }).lead_id);
                    if (!tradeInByLeadPk.has(lid)) tradeInByLeadPk.set(lid, []);
                    tradeInByLeadPk.get(lid)!.push(row);
                }
            }
        }

        const needsKommoFallback = rawLeads.filter((r) => {
            const pk = parseLeadPk(r?.id);
            if (pk == null) return false;
            const got = tradeInByLeadPk.get(pk);
            return (!got || got.length === 0) && r.lead_id_kommo != null;
        });

        const kommoIds = [
            ...new Set(
                needsKommoFallback
                    .map((r) => parseLeadPk(r.lead_id_kommo))
                    .filter((n): n is number => n != null)
            ),
        ];
        const pkSet = new Set(leadPks);
        const kommoOnlyIds = kommoIds.filter((k) => !pkSet.has(k));

        if (kommoOnlyIds.length > 0) {
            const { data: byKommoAsLeadId, error: err2 } = await supabase
                .from("trade_in_cars")
                .select("*")
                .in("lead_id", kommoOnlyIds);

            if (!err2) {
                for (const row of byKommoAsLeadId || []) {
                    const stored = Number((row as { lead_id: number }).lead_id);
                    for (const lead of rawLeads) {
                        if (parseLeadPk(lead.lead_id_kommo) !== stored) continue;
                        const pk = parseLeadPk(lead.id);
                        if (pk == null) continue;
                        const existing = tradeInByLeadPk.get(pk);
                        if (existing && existing.length > 0) continue;
                        if (!tradeInByLeadPk.has(pk)) tradeInByLeadPk.set(pk, []);
                        tradeInByLeadPk.get(pk)!.push(row);
                    }
                }
            }
        }
    } catch {
        /* trade-in es opcional en la grilla */
    }

    return tradeInByLeadPk;
};

// --- FETCH PRINCIPAL (GRID & CONTADORES) ---
export const fetchLeadsAPI = async (
    supabase: any,
    page: number,
    rowsPerPage: number,
    filters: LeadsFilters,
    options?: FetchLeadsAPIOptions
) => {
    try {
        const temperatureScope = getTemperatureHistoryScope(filters);

        if (isDateFilteredLeadsBoardFastPath(filters)) {
            return fetchLeadsDateBoardFastPath(supabase, page, rowsPerPage, filters, options);
        }

        if (isTemperatureOnlyLeadsFilter(filters)) {
            const fast = await fetchLeadsTemperatureFastPath(
                supabase,
                page,
                rowsPerPage,
                filters,
                temperatureScope,
                options
            );
            if (fast) return fast;
            console.warn(
                '[leads] RPC temperatura no disponible; usando filtro en cliente (más lento).'
            );
        }

        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;
        const tempFilterActive = isLeadsTemperatureFilterActive(filters);

        // 1. Construcción de la Query Base (DATOS)
        let query = supabase
            .from('leads')
            .select(LEADS_SELECT_WITH_RELATIONS, { count: 'exact' })
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
                let qName = supabase.from('leads').select('id');
                for (const t of tokens) qName = qName.ilike('name', `%${t}%`);
                const { data: nameData } = await qName;
                nameIds = ((nameData as { id: number }[] | null) ?? []).map((r) => r.id);

                // Teléfono: leads donde phone contiene TODOS los tokens (AND)
                let phoneIds: number[] = [];
                let qPhone = supabase.from('leads').select('id');
                for (const t of tokens) qPhone = qPhone.ilike('phone', `%${t}%`);
                const { data: phoneData } = await qPhone;
                phoneIds = ((phoneData as { id: number }[] | null) ?? []).map((r) => r.id);

                // ID Kommo: leads donde lead_id_kommo coincida exactamente
                let kommoIds: number[] = [];
                if (tokens.length === 1 && !isNaN(Number(tokens[0]))) {
                    const { data: kommoData } = await supabase
                        .from('leads')
                        .select('id')
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

        // Sub-filtro: leads con vehículo en intercambio (trade_in_cars)
        if (filters.hasTradeIn) {
            let tq = supabase
                .from("trade_in_cars")
                .select("lead_id, leads!inner(assigned_to)");
            if (filters.assignedTo && filters.assignedTo !== "all") {
                tq = tq.eq("leads.assigned_to", filters.assignedTo);
            }
            const { data: trows, error: terr } = await tq;
            if (terr) {
                console.warn("fetchLeadsAPI hasTradeIn:", terr);
                idFilters.push([-1]);
            } else {
                const tradeLeadIds: number[] = (trows || []).map((r: { lead_id: number }) => r.lead_id as number);
                const tids = [...new Set<number>(tradeLeadIds)];
                if (tids.length > 0) {
                    idFilters.push(tids);
                } else {
                    idFilters.push([-1]);
                }
            }
        }

        // Solo gestionados: resumen guardado ese día (updated_at solo cambia con resume).
        if (filters.onlyInteractions) {
            const targetDateStr = filters.exactDate ? filters.exactDate : getEcuadorDateISO();
            const { start, end } = getEcuadorRange(targetDateStr);
            const gestionLeadIds = await fetchLeadIdsGestionadosInRange(
                supabase,
                start,
                end,
                filters.assignedTo
            );
            if (gestionLeadIds.length > 0) {
                idFilters.push(gestionLeadIds);
            } else {
                idFilters.push([-1]);
            }
        }

        let resolvedTemperatureFilter: ResolvedTemperatureFilter | null = null;

        if (tempFilterActive) {
            resolvedTemperatureFilter = await resolveTemperatureFilter(
                supabase,
                filters.temperature as LeadTemperatureFilter,
                temperatureScope
            );
        }

        // Sub-filtro de presupuesto
        if (filters.hasBudget) {
            query = query.not('presupuesto_cliente', 'is', null).gt('presupuesto_cliente', 0);
        }

        // Intersect all idFilters (búsqueda, trade-in, etc.; temperatura va aparte)
        if (idFilters.length > 0) {
            let finalIds = idFilters[0];
            for (let i = 1; i < idFilters.length; i++) {
                const set = new Set(idFilters[i]);
                finalIds = finalIds.filter(id => set.has(id));
            }
            if (finalIds.length > 0) {
                query = applyLeadIdInFilter(query, finalIds);
                searchMatchIds = finalIds;
            } else {
                query = query.eq('id', -1);
                searchMatchIds = [];
            }
        }

        if (resolvedTemperatureFilter) {
            query = applyResolvedTemperatureFilter(query, resolvedTemperatureFilter);
        }

        if (filters.status && filters.status !== 'all' && filters.status !== 'datos_pedidos' && filters.status !== 'asesoria_financiamiento') {
            query = query.eq('status', filters.status);
        }
        if (filters.assignedTo && filters.assignedTo !== 'all') {
            query = query.eq('assigned_to', filters.assignedTo);
        }

        // Filtro de fecha por ingreso (created_at), también con temperatura activa.
        if (!filters.onlyInteractions) {
            query = applyLeadsCreatedAtRangeFromFilters(query, filters);
        }

        // 4. Ejecutar Query de Datos
        const { data, count, error } = await query;
        if (error) throw error;

        const rawLeads = data || [];
        const tradeInByLeadPk = tempFilterActive
            ? new Map<number, unknown[]>()
            : await fetchTradeInCarsForLeadPage(supabase, rawLeads);

        // 5. Query Secundaria para "Respondidos" (Métrica 1)
        // CORRECCIÓN: Ahora contamos como respondido si 'resume' NO es nulo y NO está vacío.
        let respondedQuery = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .not('resume', 'is', null) // Que no sea NULL
            .neq('resume', '');        // Que no esté vacío

        // Re-aplicamos los mismos filtros para que el porcentaje sea sobre lo que el usuario ve
        if (idFilters.length > 0) {
            if (searchMatchIds.length > 0) {
                respondedQuery = applyLeadIdInFilter(respondedQuery, searchMatchIds);
            } else {
                respondedQuery = respondedQuery.eq('id', -1);
            }
        }
        if (resolvedTemperatureFilter) {
            respondedQuery = applyResolvedTemperatureFilter(respondedQuery, resolvedTemperatureFilter);
        }
        if (filters.hasBudget) {
            respondedQuery = respondedQuery.not('presupuesto_cliente', 'is', null).gt('presupuesto_cliente', 0);
        }
        if (filters.status && filters.status !== 'all' && filters.status !== 'datos_pedidos' && filters.status !== 'asesoria_financiamiento') {
            respondedQuery = respondedQuery.eq('status', filters.status);
        }
        if (filters.assignedTo && filters.assignedTo !== 'all') respondedQuery = respondedQuery.eq('assigned_to', filters.assignedTo);

        if (!filters.onlyInteractions) {
            respondedQuery = applyLeadsCreatedAtRangeFromFilters(respondedQuery, filters);
        }

        const { count: respondedCount } = await respondedQuery;

        const pageLeadPks = rawLeads
            .map((r) => parseLeadPk(r?.id))
            .filter((n): n is number => n != null);

        const monthTempByLead =
            pageLeadPks.length > 0
                ? await fetchEffectiveTemperatureForLeads(
                      supabase,
                      pageLeadPks,
                      tempFilterActive
                          ? temperatureScope
                          : { mode: 'month', campaignMonth: getEcuadorMonthStartISO() },
                      tempFilterActive
                          ? (filters.temperature as LeadTemperatureFilter)
                          : undefined
                  )
                : new Map<number, string>();

        const mappedData = mapLeadsPageRows(rawLeads, tradeInByLeadPk, monthTempByLead);

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

export type LeadDayMetricBreakdown = {
    /** Ingreso y resumen guardado el mismo día. */
    respondedSameDay: number
    /** Ingreso ese día; resumen guardado después. */
    respondedLater: number
    /** Resumen guardado ese día en clientes que entraron ese día. */
    gestionIngresoDia: number
    /** Resumen guardado ese día en clientes de días anteriores. */
    gestionCartera: number
}

/** Desglose para tooltips cuando hay fecha exacta (Ecuador). */
export const fetchLeadDayMetricBreakdown = async (
    supabase: any,
    exactDate: string,
    assignedTo?: string
): Promise<LeadDayMetricBreakdown> => {
    const { start, end } = getEcuadorRange(exactDate)

    const withAssignee = (q: ReturnType<typeof supabase.from>) => {
        if (assignedTo && assignedTo !== 'all') return q.eq('assigned_to', assignedTo)
        return q
    }

    const countQuery = async (q: ReturnType<typeof supabase.from>) => {
        const { count, error } = await q
        if (error) throw error
        return count ?? 0
    }

    const [
        createdWithResume,
        createdResumeSameDay,
        gestionCartera,
    ] = await Promise.all([
        countQuery(
            withAssignee(
                supabase
                    .from('leads')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', start)
                    .lte('created_at', end)
                    .not('resume', 'is', null)
                    .neq('resume', '')
            )
        ),
        countQuery(
            withAssignee(
                supabase
                    .from('leads')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', start)
                    .lte('created_at', end)
                    .gte('updated_at', start)
                    .lte('updated_at', end)
                    .not('resume', 'is', null)
                    .neq('resume', '')
            )
        ),
        countQuery(
            withAssignee(
                supabase
                    .from('leads')
                    .select('id', { count: 'exact', head: true })
                    .gte('updated_at', start)
                    .lte('updated_at', end)
                    .lt('created_at', start)
                    .not('resume', 'is', null)
                    .neq('resume', '')
            )
        ),
    ])

    const respondedLater = Math.max(0, createdWithResume - createdResumeSameDay)
    const gestionIngresoDia = createdResumeSameDay

    return {
        respondedSameDay: createdResumeSameDay,
        respondedLater,
        gestionIngresoDia,
        gestionCartera,
    }
}

// --- GESTIONADOS HOY (Métrica 2): leads con resumen ejecutivo guardado ese día.
export const fetchDailyInteractions = async (supabase: any, assignedTo: string, exactDate: string) => {
    try {
        const targetDateStr = exactDate ? exactDate : getEcuadorDateISO();
        const { start, end } = getEcuadorRange(targetDateStr);
        const ids = await fetchLeadIdsGestionadosInRange(supabase, start, end, assignedTo);
        return ids.length;
    } catch (error) {
        console.warn('fetchDailyInteractions:', error);
        return 0;
    }
};

// --- ALERTAS DE PENDIENTES ---
export const fetchRequestStats = async (supabase: any, assignedTo: string) => {
    try {
        let datosQuery = supabase
            .from('datos_solicitados_clientes')
            .select('estado, lead_id, leads!inner(assigned_to)');

        if (assignedTo && assignedTo !== 'all') {
            datosQuery = datosQuery.eq('leads.assigned_to', assignedTo);
        }

        let asesoriaQuery = supabase
            .from('asesoria_financiamiento')
            .select('estado, lead_id, leads!inner(assigned_to)');

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

/** Leads distintos que tienen al menos un registro en trade_in_cars (respeta RLS). */
export const fetchTradeInLeadsCount = async (supabase: any, assignedTo: string) => {
    try {
        let q = supabase
            .from("trade_in_cars")
            .select("lead_id, leads!inner(assigned_to)");

        if (assignedTo && assignedTo !== "all") {
            q = q.eq("leads.assigned_to", assignedTo);
        }

        const { data, error } = await q;
        if (error) {
            console.warn("fetchTradeInLeadsCount:", error);
            return 0;
        }
        const unique = new Set((data || []).map((r: { lead_id: number }) => r.lead_id));
        return unique.size;
    } catch (e) {
        console.warn("fetchTradeInLeadsCount:", e);
        return 0;
    }
};

// --- ALERTAS DE PRESUPUESTO ---
export const fetchBudgetStats = async (supabase: any, assignedTo: string) => {
    try {
        let query = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
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