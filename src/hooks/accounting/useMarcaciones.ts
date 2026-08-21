import { useCallback, useEffect, useState } from "react";
import { marcacionesService } from "@/services/marcaciones.service";
import { MarcacionesRange, MarcacionesReporteData } from "@/types/marcaciones.types";

export const useMarcacionesData = (range?: MarcacionesRange) => {
    const [data, setData] = useState<MarcacionesReporteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const desde = range?.desde;
    const hasta = range?.hasta;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await marcacionesService.getReporte(
                desde || hasta ? { desde, hasta } : undefined
            );
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
