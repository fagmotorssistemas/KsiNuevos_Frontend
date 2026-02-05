// src/hooks/useContratosData.ts
import { useState, useEffect } from 'react';
import { contratosService } from '@/services/contratos.service';
import { ContratoResumen } from '@/types/contratos.types';

export const useContratosData = () => {
    const [contratos, setContratos] = useState<ContratoResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            setError(null);
            // Pasamos la señal al servicio (opcional, si tu servicio lo soporta)
            const data = await contratosService.getListaContratos(); 
            setContratos(data);
        } catch (err: any) {
            // Ignoramos el error si fue cancelado por desmontar el componente
            if (err.name === 'AbortError') return;
            
            console.error(err);
            setError('No se pudo cargar la lista de contratos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);

        // Cleanup: cancela la petición si el componente se desmonta
        return () => controller.abort();
    }, []);

    return { 
        contratos, 
        loading, 
        error, 
        refresh: () => fetchData() 
    };
}; 