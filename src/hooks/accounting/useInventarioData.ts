import { useState, useEffect } from 'react';
import { inventarioService } from '@/services/inventario.service';
import { syncService } from '@/services/sync.service'; // <--- 1. IMPORTANTE: Importamos el servicio
import { DashboardInventarioResponse } from '@/types/inventario.types';

export const useInventarioData = () => {
    const [data, setData] = useState<DashboardInventarioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Traemos la data REAL de Oracle (Tu fuente de verdad)
            const result = await inventarioService.getDashboard();
            
            // 2. Pintamos la UI inmediatamente (Prioridad al usuario)
            setData(result);

            // 3. SINCRONIZACIÓN EN SEGUNDO PLANO (Background)
            // Verificamos que exista listado antes de enviar
            if (result.listado && result.listado.length > 0) {
                // No usamos 'await' aquí para no detener el spinner de carga.
                // Dejamos que corra como una promesa paralela.
                syncService.syncOracleToSupabase(result.listado)
                    .then(() => console.log('⚡ Sincronización con Supabase completada'))
                    .catch((err) => console.warn('⚠️ Error en sincronización background:', err));
            }

        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el inventario de vehículos.');
        } finally {
            // El usuario deja de ver "Cargando..." apenas llega la data de Oracle,
            // no espera a que termine la sincronización de Supabase.
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