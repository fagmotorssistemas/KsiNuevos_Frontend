import { useState, useEffect } from 'react';
import { ventasService } from '@/services/ventas.service';
import { DashboardVentasResponse } from '@/types/ventas.types';

export const useVentasData = () => {
    const [data, setData] = useState<DashboardVentasResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await ventasService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo obtener el reporte de ventas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { 
        data, 
        loading, 
        error, 
        refresh: fetchData 
    };
};