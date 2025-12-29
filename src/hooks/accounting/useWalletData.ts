import { useState, useEffect } from 'react';
import { walletService } from '@/services/wallet.service';
import { KpiCartera, ClienteDeudaSummary } from '@/types/wallet.types';

export const useWalletData = () => {
    const [kpis, setKpis] = useState<KpiCartera | null>(null);
    const [topDebtors, setTopDebtors] = useState<ClienteDeudaSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para recargar datos manualmente si fuera necesario
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Ejecutamos ambas peticiones en paralelo para que cargue más rápido
            const [kpiData, debtorsData] = await Promise.all([
                walletService.getKpis(),
                walletService.getTopDebtors(10) // Traemos el Top 10
            ]);

            setKpis(kpiData);
            setTopDebtors(debtorsData);
        } catch (err) {
            console.error(err);
            setError('No se pudo conectar con el sistema de cartera.');
        } finally {
            setLoading(false);
        }
    };

    // Se ejecuta automáticamente al montar el componente
    useEffect(() => {
        fetchData();
    }, []);

    return {
        kpis,
        topDebtors,
        loading,
        error,
        refresh: fetchData // Exportamos la función por si pones un botón de "Actualizar"
    };
};