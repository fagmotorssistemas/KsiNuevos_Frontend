import { useState, useEffect } from 'react';
import { finanzasService } from '@/services/finanzas.service';
import { DashboardFinanzasResponse } from '@/types/finanzas.types';

export const useFinanzasData = () => {
    const [data, setData] = useState<DashboardFinanzasResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await finanzasService.getDashboard();
            
            // Opcional: Si son muchísimos datos, podríamos ordenar aquí o limitar para la vista inicial
            // result.ultimosMovimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el balance financiero.');
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