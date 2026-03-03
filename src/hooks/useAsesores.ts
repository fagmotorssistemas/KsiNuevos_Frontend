"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface Asesor {
    id: string;
    full_name: string;
}

/**
 * Lista de asesores (profiles con rol vendedor, admin o finanzas) para selector "Asesor que vendió".
 */
export function useAsesores() {
    const { supabase } = useAuth();
    const [asesores, setAsesores] = useState<Asesor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAsesores = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("id, full_name")
                    .eq("status", "activo")
                    .in("role", ["vendedor", "admin", "finanzas"])
                    .order("full_name");

                if (error) {
                    console.error("Error al cargar asesores:", error);
                    setAsesores([]);
                    return;
                }
                setAsesores(data ?? []);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAsesores();
    }, [supabase]);

    return { asesores, isLoading };
}
