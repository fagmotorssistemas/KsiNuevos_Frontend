import { LeadWithDetails, LeadsFilters, SortDescriptor, EXCLUDED_ID } from "@/types/leads.types";

// Tu helper de fechas exacto
const isSameDate = (date1: Date, date2: Date) => {
    return date1.toLocaleDateString('en-CA') === date2.toLocaleDateString('en-CA');
};

/**
 * Lógica exacta de filtrado y ordenamiento que tenías en 'processedLeads'
 */
export const processLeadsLogic = (
    leads: LeadWithDetails[], 
    filters: LeadsFilters, 
    sortDescriptor: SortDescriptor
): LeadWithDetails[] => {
    
    // 1. Filtro base (Excluir ID)
    let filtered = leads.filter(l => l.assigned_to !== EXCLUDED_ID);

    // 2. Buscador (Incluyendo lógica de carros)
    if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(l =>
            l.name.toLowerCase().includes(query) ||
            l.phone?.includes(query) ||
            (l.lead_id_kommo && l.lead_id_kommo.toString().toLowerCase().includes(query)) ||
            (l.profiles?.full_name && l.profiles.full_name.toLowerCase().includes(query)) ||
            (l.interested_cars && l.interested_cars.some(car => 
                car.brand.toLowerCase().includes(query) || 
                car.model.toLowerCase().includes(query)
            ))
        );
    }

    // 3. Filtros Dropdown
    if (filters.status !== 'all') filtered = filtered.filter(l => l.status === filters.status);
    if (filters.temperature !== 'all') filtered = filtered.filter(l => l.temperature === filters.temperature);
    if (filters.assignedTo !== 'all') filtered = filtered.filter(l => l.assigned_to === filters.assignedTo);

    // 4. Filtros de Fecha
    if (filters.exactDate) {
        filtered = filtered.filter(l => {
            if (!l.created_at) return false;
            const filterDate = new Date(filters.exactDate + 'T12:00:00');
            const leadDate = new Date(l.created_at);
            return isSameDate(leadDate, filterDate);
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
                case '30days': return leadDate >= (todayStart - (30 * 24 * 60 * 60 * 1000));
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

/**
 * Lógica exacta de cálculo de interacciones
 */
export const calculateInteractionsLogic = (leads: LeadWithDetails[], filters: LeadsFilters) => {
    let interactions = leads.filter(l => l.assigned_to !== EXCLUDED_ID);
    
    if (filters.assignedTo !== 'all') {
        interactions = interactions.filter(l => l.assigned_to === filters.assignedTo);
    }

    const targetDate = filters.exactDate 
        ? new Date(filters.exactDate + 'T12:00:00')
        : new Date(); 

    interactions = interactions.filter(l => {
        if (!l.resume || l.resume.trim() === '') return false;
        if (!l.updated_at) return false;
        
        const updateDate = new Date(l.updated_at);
        return isSameDate(updateDate, targetDate);
    });

    return interactions.length;
};