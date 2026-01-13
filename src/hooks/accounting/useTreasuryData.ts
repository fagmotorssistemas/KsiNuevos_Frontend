import { useState, useEffect } from 'react';
import { treasuryService } from '@/services/treasury.service';
import { DetalleTesoreriaResponse } from '@/types/treasury.types';

export const useTreasuryData = () => {
    const [data, setData] = useState<DetalleTesoreriaResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await treasuryService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo obtener la información bancaria.');
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