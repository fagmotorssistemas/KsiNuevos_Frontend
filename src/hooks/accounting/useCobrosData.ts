import { useState, useEffect } from 'react';
import { cobrosService } from '@/services/cobros.service';
import { DashboardCobrosResponse } from '@/types/cobros.types';

export const useCobrosData = () => {
    const [data, setData] = useState<DashboardCobrosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await cobrosService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el reporte de cobros.');
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