import { matchesInventorySearch } from "@/lib/inventario/inventorySearch";
import { LeadWithDetails, LeadsFilters, SortDescriptor } from "@/types/leads.types";

type InterestCarLike = {
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
};

const searchTokens = (search: string) => search.trim().toLowerCase().split(/\s+/).filter(Boolean);

export function carMatchesSearch(car: InterestCarLike, search: string): boolean {
    return matchesInventorySearch(search, [car.brand, car.model, car.year]);
}

/** Auto a mostrar en Interés: el que coincide con la búsqueda; si no, el primero. */
export function getDisplayInterestCar<T extends InterestCarLike>(
    cars: T[] | undefined | null,
    search: string
): T | undefined {
    if (!cars?.length) return undefined;
    const tokens = searchTokens(search);
    if (tokens.length === 0) return cars[0];

    const fullMatch = cars.find((car) => carMatchesSearch(car, search));
    if (fullMatch) return fullMatch;

    const anyTokenMatch = cars.find((car) =>
        tokens.some((token) => matchesInventorySearch(token, [car.brand, car.model, car.year]))
    );
    return anyTokenMatch ?? cars[0];
}

export function formatInterestVehicle(
    cars: InterestCarLike[] | undefined | null,
    search: string
): string {
    const car = getDisplayInterestCar(cars, search);
    if (!car) return "";
    const label = [car.brand, car.model, car.year].filter(Boolean).join(" ").trim();
    const extra = (cars?.length ?? 0) > 1 ? ` (+${cars!.length - 1})` : "";
    return `${label}${extra}`;
}

/** Rango personalizado YYYY-MM-DD (inicio/fin). Compatibilidad: solo exactDate. */
export function getLeadsCustomYmdRange(
    filters: Pick<LeadsFilters, "dateFrom" | "dateTo" | "exactDate">
): { from: string; to: string } | null {
    const from = filters.dateFrom || filters.exactDate || filters.dateTo;
    const to = filters.dateTo || filters.dateFrom || filters.exactDate;
    if (!from && !to) return null;
    const start = from || to!;
    const end = to || from!;
    return start <= end ? { from: start, to: end } : { from: end, to: start };
}

export function withCustomDateRange(
    from: string,
    to: string,
    changed: "from" | "to" | "both" = "both"
): Pick<LeadsFilters, "dateFrom" | "dateTo" | "exactDate" | "dateRange"> {
    let dateFrom = from;
    let dateTo = to;
    if (dateFrom && dateTo && dateFrom > dateTo) {
        if (changed === "from") dateTo = dateFrom;
        else if (changed === "to") dateFrom = dateTo;
        else {
            const swap = dateFrom;
            dateFrom = dateTo;
            dateTo = swap;
        }
    }
    return {
        dateFrom,
        dateTo,
        exactDate: dateFrom && dateTo && dateFrom === dateTo ? dateFrom : "",
        dateRange: "all",
    };
}

export const emptyCustomDateRange = {
    dateFrom: "",
    dateTo: "",
    exactDate: "",
} as const;

/**
 * Lógica exacta de filtrado y ordenamiento que tenías en 'processedLeads'
 */
export const processLeadsLogic = (
    leads: LeadWithDetails[], 
    filters: LeadsFilters, 
    sortDescriptor: SortDescriptor
): LeadWithDetails[] => {
    
    let filtered = [...leads];

    // 2. Buscador (Incluyendo lógica de carros)
    if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(l =>
            l.name.toLowerCase().includes(query) ||
            l.phone?.includes(query) ||
            (l.lead_id_kommo && l.lead_id_kommo.toString().toLowerCase().includes(query)) ||
            (l.profiles?.full_name && l.profiles.full_name.toLowerCase().includes(query)) ||
            (l.interested_cars && l.interested_cars.some(car => 
                car.brand?.toLowerCase().includes(query) || 
                car.model?.toLowerCase().includes(query)
            ))
        );
    }

    // 3. Filtros Dropdown
    if (filters.status !== 'all') filtered = filtered.filter(l => l.status === filters.status);
    if (filters.temperature !== 'all') filtered = filtered.filter(l => l.temperature === filters.temperature);
    if (filters.assignedTo !== 'all') filtered = filtered.filter(l => l.assigned_to === filters.assignedTo);

    // 4. Filtros de Fecha
    const customRange = getLeadsCustomYmdRange(filters);
    if (customRange) {
        filtered = filtered.filter(l => {
            if (!l.created_at) return false;
            const leadYmd = new Date(l.created_at).toLocaleDateString('en-CA', {
                timeZone: 'America/Guayaquil',
            });
            return leadYmd >= customRange.from && leadYmd <= customRange.to;
        });
    } else if (filters.dateRange !== 'all') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        filtered = filtered.filter(l => {
            if (!l.created_at) return false;
            const leadDate = new Date(l.created_at).getTime();
            switch (filters.dateRange) {
                case 'today': return leadDate >= todayStart;
                case '7days': return leadDate >= (todayStart - (7 * 24 * 60 * 60 * 1000));
                case '15days': return leadDate >= (todayStart - (15 * 24 * 60 * 60 * 1000));
                case 'thisMonth': {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    return leadDate >= monthStart;
                }
                default: return true;
            }
        });
    }

    // 5. Ordenamiento (Tu lógica exacta de sort)
    return filtered.sort((a, b) => {
        const col = sortDescriptor.column as keyof LeadWithDetails;
        if (col === 'assigned_to') {
            const first = a.profiles?.full_name || '';
            const second = b.profiles?.full_name || '';
            let cmp = first.localeCompare(second);
            return sortDescriptor.direction === "descending" ? cmp * -1 : cmp;
        }
        // @ts-ignore
        const first = a[col];
        // @ts-ignore
        const second = b[col];
        if (first === null || first === undefined) return 1;
        if (second === null || second === undefined) return -1;
        if (typeof first === "string" && typeof second === "string") {
            let cmp = first.localeCompare(second);
            return sortDescriptor.direction === "descending" ? cmp * -1 : cmp;
        }
        const aNum = Number(first);
        const bNum = Number(second);
        return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
    });
};