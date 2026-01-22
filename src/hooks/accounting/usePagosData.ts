import { useState, useEffect } from 'react';
import { pagosService } from '@/services/pagos.service';
import { DashboardPagosResponse } from '@/types/pagos.types';

export const usePagosData = () => {
    const [data, setData] = useState<DashboardPagosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await pagosService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el reporte de pagos.');
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