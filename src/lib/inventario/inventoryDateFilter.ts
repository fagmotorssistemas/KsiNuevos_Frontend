export type InventoryDateRange = 'all' | 'today' | '7days' | '15days' | 'thisMonth' | 'custom'

export const INVENTORY_DATE_FILTER_OPTIONS: { value: InventoryDateRange; label: string; hint: string }[] = [
    { value: 'all', label: 'Todo el tiempo', hint: 'Sin filtro de fecha' },
    { value: 'today', label: 'Hoy', hint: 'Ingresados hoy' },
    { value: '7days', label: 'Últimos 7 días', hint: 'De hoy hacia atrás 7 días' },
    { value: '15days', label: 'Últimos 15 días', hint: 'De hoy hacia atrás 15 días' },
    { value: 'thisMonth', label: 'Este mes', hint: 'Desde el día 1 del mes' },
    { value: 'custom', label: 'Rango personalizado', hint: 'Elige fecha desde y hasta' },
]

const ECUADOR_TZ = 'America/Guayaquil'

export function toEcuadorYmd(value: Date | string): string {
    return new Date(value).toLocaleDateString('en-CA', { timeZone: ECUADOR_TZ })
}

export function getEcuadorDateISO() {
    return toEcuadorYmd(new Date())
}

function addCalendarDays(ymd: string, days: number): string {
    const [year, month, day] = ymd.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function matchesInventoryDateRange(
    createdAt: string | null | undefined,
    opts: { dateRange: InventoryDateRange; dateFrom?: string; dateTo?: string }
): boolean {
    if (opts.dateRange === 'all') return true
    if (!createdAt) return false

    const createdYmd = toEcuadorYmd(createdAt)
    const todayYmd = getEcuadorDateISO()

    if (opts.dateRange === 'custom') {
        if (!opts.dateFrom || !opts.dateTo) return true
        return createdYmd >= opts.dateFrom && createdYmd <= opts.dateTo
    }

    switch (opts.dateRange) {
        case 'today':
            return createdYmd === todayYmd
        case '7days':
            return createdYmd >= addCalendarDays(todayYmd, -6) && createdYmd <= todayYmd
        case '15days':
            return createdYmd >= addCalendarDays(todayYmd, -14) && createdYmd <= todayYmd
        case 'thisMonth':
            return createdYmd.startsWith(todayYmd.slice(0, 7))
        default:
            return true
    }
}
