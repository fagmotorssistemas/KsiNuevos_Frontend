import {
    MarcacionesRange,
    MarcacionesReporteData,
    MarcacionesReporteResponse,
} from "@/types/marcaciones.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function buildReporteUrl(range?: MarcacionesRange): string {
    const params = new URLSearchParams();
    if (range?.desde) params.set("desde", range.desde);
    if (range?.hasta) params.set("hasta", range.hasta);
    const query = params.toString();
    return `${API_URL}/marcaciones/reporte${query ? `?${query}` : ""}`;
}

export const marcacionesService = {
    async getReporte(range?: MarcacionesRange): Promise<MarcacionesReporteData> {
        const res = await fetch(buildReporteUrl(range));
        const json = (await res.json()) as MarcacionesReporteResponse;

        if (!res.ok || !json.success) {
            throw new Error(json.message || "Error al cargar el reporte de marcaciones");
        }

        return json.data;
    },
};
