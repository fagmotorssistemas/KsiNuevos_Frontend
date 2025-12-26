import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClientePB, ContratoCompleto, CuotaPB } from "./types";

export function useClienteDetail(clienteId: string) {
    const { supabase } = useAuth();
    
    const [cliente, setCliente] = useState<ClientePB | null>(null);
    const [contratos, setContratos] = useState<ContratoCompleto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!clienteId) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Obtener datos del Cliente
            const { data: clienteData, error: clienteError } = await supabase
                .from('clientespb')
                .select('*')
                .eq('id', clienteId)
                .single();

            if (clienteError) throw clienteError;
            setCliente(clienteData);

            // 2. Obtener Contratos del Cliente
            const { data: contratosData, error: contratosError } = await supabase
                .from('contratospb')
                .select('*')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false });

            if (contratosError) throw contratosError;

            // 3. Obtener Cuotas
            let contratosCompletos: ContratoCompleto[] = [];

            if (contratosData && contratosData.length > 0) {
                const contratosIds = contratosData.map(c => c.id);
                
                const { data: cuotasData, error: cuotasError } = await supabase
                    .from('cuotaspb')
                    .select('*')
                    .in('contrato_id', contratosIds)
                    .order('indice_ordenamiento', { ascending: true });

                if (cuotasError) throw cuotasError;

                contratosCompletos = contratosData.map(contrato => {
                    const rawCuotas = cuotasData?.filter(cuota => cuota.contrato_id === contrato.id) || [];
                    
                    const cuotasSanitized = rawCuotas.map(c => ({
                        ...c,
                        contrato_id: c.contrato_id ?? "", 
                        es_adicional: c.es_adicional ?? false
                    })) as CuotaPB[];

                    return {
                        ...contrato,
                        tasa_mora_diaria: contrato.tasa_mora_diaria ?? 0, 
                        saldo_inicial_total: contrato.saldo_inicial_total ?? 0,
                        cuotas: cuotasSanitized
                    } as ContratoCompleto;
                });
            }

            setContratos(contratosCompletos);

        } catch (err: any) {
            console.error("Error fetching cliente details:", err);
            setError(err.message || "Error cargando datos");
        } finally {
            setLoading(false);
        }
    }, [clienteId, supabase]);

    // CAMBIO: Se ejecuta siempre, sin esperar a "authLoading"
    useEffect(() => {
        fetchData();
    }, [clienteId, fetchData]);

    return {
        cliente,
        contratos,
        loading,
        error,
        reload: fetchData
    };
}