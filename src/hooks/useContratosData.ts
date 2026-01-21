import { useState, useEffect } from 'react';
import { contratosService } from '@/services/contratos.service';
import { ContratoResumen } from '@/types/contratos.types';

export const useContratosData = () => {
    // Ahora almacenamos el resumen, no el detalle completo
    const [contratos, setContratos] = useState<ContratoResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await contratosService.getListaContratos();
            setContratos(data);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar la lista de contratos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { 
        contratos, 
        loading, 
        error, 
        refresh: fetchData 
    };
};