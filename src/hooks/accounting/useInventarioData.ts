import { useState, useEffect } from 'react';
import { inventarioService } from '@/services/inventario.service';
import { DashboardInventarioResponse } from '@/types/inventario.types';

export const useInventarioData = () => {
    const [data, setData] = useState<DashboardInventarioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await inventarioService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el inventario de vehículos.');
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