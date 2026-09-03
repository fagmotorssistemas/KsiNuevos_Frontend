import {
    MarcacionesMesData,
    MarcacionesMesResponse,
    MarcacionesRange,
    MarcacionesReporteData,
    MarcacionesReporteResponse,
} from "@/types/marcaciones.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const FIRST_LOAD_TIMEOUT_MS = 70_000;
const WARM_LOAD_TIMEOUT_MS = 20_000;

let reporteWarm = false;
let mesWarm = false;

function buildReporteUrl(range?: MarcacionesRange): string {
    const params = new URLSearchParams();
    if (range?.desde) params.set("desde", range.desde);
    if (range?.hasta) params.set("hasta", range.hasta);
    const query = params.toString();
    return `${API_URL}/marcaciones/reporte${query ? `?${query}` : ""}`;
}

async function fetchJson<T extends { success: boolean; message?: string; data: unknown }>(
    url: string,
    timeoutMs: number
): Promise<T> {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const json = (await res.json()) as T;

    if (!res.ok || !json.success) {
        throw new Error(json.message || "Error al cargar marcaciones");
    }

    return json;
}

function timeoutMessage(err: unknown, firstLoad: boolean): string {
    const name = err instanceof DOMException ? err.name : "";
    const isTimeout =
        name === "TimeoutError" ||
        name === "AbortError" ||
        (err instanceof Error && /timeout|aborted/i.test(err.message));

    if (isTimeout && firstLoad) {
        return "La primera carga puede tardar hasta un minuto. Espera o vuelve a intentar.";
    }
    if (isTimeout) {
        return "La consulta tardó demasiado. Intenta de nuevo.";
    }
    return err instanceof Error ? err.message : "Error al cargar marcaciones";
}

export const marcacionesService = {
    async getReporte(range?: MarcacionesRange): Promise<MarcacionesReporteData> {
        const firstLoad = !reporteWarm;
        try {
            const json = await fetchJson<MarcacionesReporteResponse>(
                buildReporteUrl(range),
                firstLoad ? FIRST_LOAD_TIMEOUT_MS : WARM_LOAD_TIMEOUT_MS
            );
            reporteWarm = true;
            return json.data;
        } catch (err) {
            throw new Error(timeoutMessage(err, firstLoad));
        }
    },

    async getMes(yearMonth: string): Promise<MarcacionesMesData> {
        const firstLoad = !mesWarm;
        try {
            const json = await fetchJson<MarcacionesMesResponse>(
                `${API_URL}/marcaciones/mes/${yearMonth}`,
                firstLoad ? FIRST_LOAD_TIMEOUT_MS : WARM_LOAD_TIMEOUT_MS
            );
            mesWarm = true;
            return json.data;
        } catch (err) {
            throw new Error(timeoutMessage(err, firstLoad));
        }
    },
};
