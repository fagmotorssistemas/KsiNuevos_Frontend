import type { MarcacionEstado } from "@/types/marcaciones.types";

export function formatFechaLarga(fecha: string) {
    const parsed = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return fecha;
    return parsed.toLocaleDateString("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function formatHora(value?: string | null) {
    if (!value) return "—";
    return value.slice(0, 5);
}

export function formatFechaCorta(fecha: string) {
    const parsed = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return fecha;
    const raw = parsed.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
    return raw.replace(".", "").toLowerCase();
}

export function formatDiaCorto(fecha: string) {
    const parsed = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "—";
    const raw = parsed.toLocaleDateString("es-EC", { weekday: "short" }).replace(".", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function formatAlmuerzo(ida?: string | null, vuelta?: string | null) {
    if (!ida && !vuelta) return "—";
    return `${formatHora(ida)}–${formatHora(vuelta)}`;
}

export function formatSalida(value?: string | null) {
    if (!value) return "—";
    const hora = value.slice(0, 5);
    return hora === "20:00" ? "20:00*" : hora;
}

/** Decimal del backend → H:mm para la tabla. No calcula extras. */
export function formatDuracion(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return "0:00";
    const totalMinutes = Math.round(Math.abs(value) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function extraDelDia(dia: {
    extras?: number | null;
    diferencia?: number | null;
    estado?: string | null;
}): number {
    if (dia.extras != null) return dia.extras;
    if (dia.estado === "de_mas") return dia.diferencia ?? 0;
    return 0;
}

export function deMenosDelDia(dia: {
    deMenos?: number | null;
    diferencia?: number | null;
    estado?: string | null;
}): number {
    if (dia.deMenos != null) return dia.deMenos;
    if (dia.estado === "de_menos" || dia.estado === "falta") {
        return Math.abs(dia.diferencia ?? 0);
    }
    return 0;
}

export function sumasColumnasDias(
    dias: Array<{
        extras?: number | null;
        deMenos?: number | null;
        diferencia?: number | null;
        estado?: string | null;
        horasHechas?: number | null;
        horasLegales?: number | null;
    }>
): { extras: number; deMenos: number; hechas: number; legales: number } {
    return dias.reduce(
        (acc, dia) => ({
            extras: acc.extras + extraDelDia(dia),
            deMenos: acc.deMenos + deMenosDelDia(dia),
            hechas: acc.hechas + (dia.horasHechas ?? 0),
            legales: acc.legales + (dia.horasLegales ?? 0),
        }),
        { extras: 0, deMenos: 0, hechas: 0, legales: 0 } as {
            extras: number;
            deMenos: number;
            hechas: number;
            legales: number;
        }
    );
}

/** Solo formatea el número que ya viene del backend. */
export function formatHoras(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const abs = Math.abs(value);
    const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, "");
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${formatted} h`;
}

export function formatHorasAbs(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const formatted = Number.isInteger(value)
        ? String(value)
        : value.toFixed(2).replace(/\.?0+$/, "");
    return `${formatted} h`;
}

export function formatSyncTime(value?: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

export const MARCACION_ESTADO_UI: Record<
    MarcacionEstado,
    { label: string; className: string }
> = {
    de_mas: {
        label: "Extra",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    de_menos: {
        label: "De menos",
        className: "bg-amber-50 text-amber-800 border-amber-200",
    },
    justo: {
        label: "Justo",
        className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    falta: {
        label: "Sin marca",
        className: "bg-red-50 text-red-700 border-red-200",
    },
    no_laboral: {
        label: "No laboral",
        className: "bg-slate-50 text-slate-500 border-slate-200",
    },
};

export function estadoUi(estado?: string | null) {
    if (!estado) return null;
    return MARCACION_ESTADO_UI[estado as MarcacionEstado] ?? {
        label: estado.replace(/_/g, " "),
        className: "bg-slate-100 text-slate-600 border-slate-200",
    };
}
