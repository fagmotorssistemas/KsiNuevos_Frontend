import { useState, useEffect, useCallback } from "react";
import { Instalador } from "@/types/rastreadores.types";
import { instaladoresService } from "@/services/instaladores.service"; // o donde lo hayas puesto

export function useInstaladores() {
    const [instaladores, setInstaladores] = useState<Instalador[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadInstaladores = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await instaladoresService.getInstaladores();
            setInstaladores(data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInstaladores();
    }, [loadInstaladores]);

    // KPIs rápidos
    const activos = instaladores.filter(i => i.activo).length;
    const inactivos = instaladores.length - activos;

    return { 
        instaladores, 
        isLoading, 
        loadInstaladores,
        activos,
        inactivos
    };
}