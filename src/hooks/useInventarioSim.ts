import { useState, useEffect, useCallback } from "react";
import { InventarioSIM } from "@/types/rastreadores.types";
// Asumiendo que crearás este método en tu rastreadoresService o en un nuevo simService
import { rastreadoresService } from "@/services/rastreadores.service"; 

export function useInventarioSIM() {
    const [sims, setSims] = useState<InventarioSIM[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSims = useCallback(async () => {
        setIsLoading(true);
        try {
            // Aquí llamarías a tu servicio real que conecta con Supabase
            // const data = await supabase.from('gps_sims').select('*').eq('estado', 'STOCK');
            const data = await rastreadoresService.getInventarioSims(); 
            setSims(data);
        } catch (error) {
            console.error("Error cargando SIMs:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSims();
    }, [loadSims]);

    const totalStock = sims.length;
    const costoTotalMensual = sims.reduce((acc, curr) => acc + (curr.costo_mensual || 0), 0);

    return { 
        sims, 
        isLoading, 
        loadSims, 
        totalStock, 
        costoTotalMensual 
    };
}