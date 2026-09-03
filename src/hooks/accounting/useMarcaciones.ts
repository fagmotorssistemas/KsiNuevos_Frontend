import { useCallback, useEffect, useState } from "react";
import { marcacionesService } from "@/services/marcaciones.service";
import { MarcacionesMesData, MarcacionesRange, MarcacionesReporteData } from "@/types/marcaciones.types";

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getCurrentMonthValue(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

/** Rango de un mes YYYY-MM. El mes en curso llega solo hasta hoy. */
export function getRangeForMonth(yearMonth: string): Required<MarcacionesRange> {
    const [yearStr, monthStr] = yearMonth.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const hoy = new Date();
    const desde = new Date(year, monthIndex, 1);
    const ultimoDia = new Date(year, monthIndex + 1, 0);
    const esMesActual =
        year === hoy.getFullYear() && monthIndex === hoy.getMonth();

    return {
        desde: toIsoDate(desde),
        hasta: toIsoDate(esMesActual && hoy < ultimoDia ? hoy : ultimoDia),
    };
}

/** Primer día del mes en curso hasta hoy. Evita el default del backend (julio → hoy). */
export function getMesActualRange(): Required<MarcacionesRange> {
    return getRangeForMonth(getCurrentMonthValue());
}

/** Primer mes con datos de reloj. */
const MARCACIONES_FIRST_MONTH = "2026-07";

export function getMonthOptions(): { value: string; label: string }[] {
    const current = getCurrentMonthValue();
    const options: { value: string; label: string }[] = [];

    let [year, month] = current.split("-").map(Number);
    const [startYear, startMonth] = MARCACIONES_FIRST_MONTH.split("-").map(Number);

    while (year > startYear || (year === startYear && month >= startMonth)) {
        const date = new Date(year, month - 1, 1);
        const monthName = date.toLocaleDateString("es-EC", { month: "long" });
        options.push({
            value: `${year}-${String(month).padStart(2, "0")}`,
            label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
        });
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }

    return options;
}

export const useMarcacionesData = (range?: MarcacionesRange) => {
    const [data, setData] = useState<MarcacionesReporteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mesActual = getMesActualRange();
    const desde = range?.desde || mesActual.desde;
    const hasta = range?.hasta || mesActual.hasta;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await marcacionesService.getReporte({ desde, hasta });
            setData(result);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo obtener el reporte de marcaciones."
            );
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refresh: fetchData,
    };
};

export const useMarcacionesMes = (yearMonth: string) => {
    const [data, setData] = useState<MarcacionesMesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mes = yearMonth || getCurrentMonthValue();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await marcacionesService.getMes(mes);
            setData(result);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo obtener el informe del mes."
            );
        } finally {
            setLoading(false);
        }
    }, [mes]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refresh: fetchData,
    };
};
