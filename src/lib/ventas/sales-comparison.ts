import type { VentaVehiculo } from "@/types/ventas.types";

const ECUADOR_TZ = "America/Guayaquil";

export type MonthCount = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MONTH_COUNT_OPTIONS: MonthCount[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export type CompareMonth = {
    year: number;
    month: number;
    key: string;
    label: string;
    shortLabel: string;
    isCurrent: boolean;
    daysInMonth: number;
    likeForLikeEndDay: number;
};

export type MonthTotals = {
    month: CompareMonth;
    units: number;
    projected: number | null;
    deltaAbs: number | null;
    deltaPct: number | null;
};

export type BreakdownRow = {
    key: string;
    label: string;
    values: number[];
    deltaAbs: number;
    deltaPct: number | null;
    total: number;
};

export type SalesComparison = {
    months: CompareMonth[];
    totals: MonthTotals[];
    byAgent: BreakdownRow[];
    byBrand: BreakdownRow[];
    byType: BreakdownRow[];
    cutoffDay: number;
    currentProjected: number | null;
};

export type ComparisonFilters = {
    brand: string;
    salesperson: string;
};

export function getEcuadorTodayParts(now = new Date()) {
    const ymd = now.toLocaleDateString("en-CA", { timeZone: ECUADOR_TZ });
    const [year, month, day] = ymd.split("-").map(Number);
    return { year, month, day, ymd };
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function shiftMonth(year: number, month: number, delta: number) {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthLabel(year: number, month: number) {
    return new Date(year, month - 1, 1).toLocaleDateString("es-EC", {
        month: "short",
        year: "numeric",
    });
}

function shortMonthLabel(year: number, month: number) {
    return new Date(year, month - 1, 1).toLocaleDateString("es-EC", {
        month: "short",
    });
}

export function buildCompareMonths(count: MonthCount, now = new Date()): CompareMonth[] {
    const today = getEcuadorTodayParts(now);
    const months: CompareMonth[] = [];

    for (let offset = count - 1; offset >= 0; offset--) {
        const shifted = shiftMonth(today.year, today.month, -offset);
        const dim = daysInMonth(shifted.year, shifted.month);
        const isCurrent = shifted.year === today.year && shifted.month === today.month;
        months.push({
            year: shifted.year,
            month: shifted.month,
            key: `${shifted.year}-${String(shifted.month).padStart(2, "0")}`,
            label: monthLabel(shifted.year, shifted.month),
            shortLabel: shortMonthLabel(shifted.year, shifted.month),
            isCurrent,
            daysInMonth: dim,
            likeForLikeEndDay: Math.min(today.day, dim),
        });
    }

    return months;
}

export function parseVentaDay(fecha: string): { year: number; month: number; day: number } | null {
    if (!fecha) return null;
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return null;
    const ymd = parsed.toLocaleDateString("en-CA", { timeZone: ECUADOR_TZ });
    const [year, month, day] = ymd.split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day };
}

function unitsOf(venta: VentaVehiculo) {
    return Number.isFinite(venta.cantidad) && venta.cantidad > 0 ? venta.cantidad : 1;
}

function matchesMonth(
    venta: VentaVehiculo,
    month: CompareMonth,
    mode: "full" | "like"
) {
    const day = parseVentaDay(venta.fecha);
    if (!day) return false;
    if (day.year !== month.year || day.month !== month.month) return false;
    if (mode === "like" && day.day > month.likeForLikeEndDay) return false;
    return true;
}

function applyFilters(listado: VentaVehiculo[], filters: ComparisonFilters) {
    return listado.filter((venta) => {
        if (filters.brand !== "all" && venta.marca !== filters.brand) return false;
        if (filters.salesperson !== "all" && venta.agenteVenta !== filters.salesperson) return false;
        return true;
    });
}

function sumUnits(ventas: VentaVehiculo[], month: CompareMonth, mode: "full" | "like") {
    let total = 0;
    for (const venta of ventas) {
        if (matchesMonth(venta, month, mode)) total += unitsOf(venta);
    }
    return total;
}

function deltaPct(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return ((current - previous) / previous) * 100;
}

function breakdown(
    ventas: VentaVehiculo[],
    months: CompareMonth[],
    getLabel: (venta: VentaVehiculo) => string
): BreakdownRow[] {
    const map = new Map<string, number[]>();

    for (const venta of ventas) {
        const label = (getLabel(venta) || "Sin dato").trim() || "Sin dato";
        let values = map.get(label);
        if (!values) {
            values = months.map(() => 0);
            map.set(label, values);
        }
        months.forEach((month, index) => {
            if (matchesMonth(venta, month, month.isCurrent ? "like" : "full")) {
                values![index] += unitsOf(venta);
            }
        });
    }

    return Array.from(map.entries())
        .map(([label, values]) => {
            const last = values[values.length - 1] ?? 0;
            const prev = values[values.length - 2] ?? 0;
            return {
                key: label,
                label,
                values,
                deltaAbs: last - prev,
                deltaPct: deltaPct(last, prev),
                total: values.reduce((sum, value) => sum + value, 0),
            };
        })
        .sort((a, b) => b.total - a.total);
}

export function buildSalesComparison(
    listado: VentaVehiculo[],
    count: MonthCount,
    filters: ComparisonFilters,
    now = new Date()
): SalesComparison {
    const today = getEcuadorTodayParts(now);
    const months = buildCompareMonths(count, now);
    const ventas = applyFilters(listado, filters);

    const units = months.map((month) =>
        sumUnits(ventas, month, month.isCurrent ? "like" : "full")
    );

    const totals: MonthTotals[] = months.map((month, index) => {
        const value = units[index];
        const previous = index > 0 ? units[index - 1] : null;
        const projected =
            month.isCurrent && today.day > 0
                ? Math.round((value / today.day) * month.daysInMonth)
                : null;

        return {
            month,
            units: value,
            projected,
            deltaAbs: previous == null ? null : value - previous,
            deltaPct: previous == null ? null : deltaPct(value, previous),
        };
    });

    const current = totals.find((item) => item.month.isCurrent) ?? null;

    return {
        months,
        totals,
        byAgent: breakdown(ventas, months, (venta) => venta.agenteVenta || "Sin agente"),
        byBrand: breakdown(ventas, months, (venta) => venta.marca || "Sin marca"),
        byType: breakdown(
            ventas,
            months,
            (venta) => venta.tipoVehiculo || venta.tipoProducto || "Otros"
        ),
        cutoffDay: today.day,
        currentProjected: current?.projected ?? null,
    };
}
