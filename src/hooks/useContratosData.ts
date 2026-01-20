import { useState, useEffect } from 'react';
import { contratosService } from '@/services/contratos.service';
import { ContratoDetalle } from '@/types/contratos.types';

export const useContratosData = () => {
    const [contratos, setContratos] = useState<ContratoDetalle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Llamamos al endpoint masivo
            const result = await contratosService.getAllData();
            // Nos interesa principalmente el array de detalles que es el más completo
            setContratos(result.detallesContratos);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el histórico de contratos.');
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