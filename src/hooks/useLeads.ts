import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";

// --- TIPOS ---
// Exportamos este tipo para que el componente de Tabla lo pueda usar
export type LeadWithDetails = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: Database['public']['Tables']['interested_cars']['Row'][];
};

export type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export function useLeads() {
    // 1. Obtenemos cliente y usuario del AuthContext
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    // 2. Estados locales
    const [leads, setLeads] = useState<LeadWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    // 3. Función de carga (Memoizada con useCallback para poder exportarla)
    const fetchLeads = useCallback(async () => {
        // Si no hay usuario cargado, no hacemos nada (evita errores 401)
        if (!user) return;

        setIsLoading(true);

        const { data, error } = await supabase
            .from('leads')
            .select('*, interested_cars(*)') // Traemos la relación
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando leads:", error);
            // Aquí podrías agregar un estado de error si quisieras mostrar una alerta
        } else {
            // @ts-ignore: Supabase types join workaround
            setLeads(data || []);
        }
        setIsLoading(false);
    }, [supabase, user]);

    // 4. Efecto: Cargar datos cuando el usuario esté listo
    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchLeads();
        }
    }, [isAuthLoading, user, fetchLeads]);

    // 5. Lógica de Ordenamiento (Memoizada)
    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            const col = sortDescriptor.column as keyof LeadWithDetails;
            const first = a[col];
            const second = b[col];

            // Manejo de nulos (siempre al final)
            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;

            // Comparación de Strings
            if (typeof first === "string" && typeof second === "string") {
                let cmp = first.localeCompare(second);
                if (sortDescriptor.direction === "descending") cmp *= -1;
                return cmp;
            }

            // Comparación Numérica / Booleana
            const aNum = Number(first);
            const bNum = Number(second);
            return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
        });
    }, [leads, sortDescriptor]);

    // 6. Retornamos todo lo que la UI necesita
    return {
        leads: sortedLeads,      // La lista ya ordenada
        rawLeads: leads,         // La lista original (por si acaso)
        isLoading: isLoading || isAuthLoading, // Carga combinada
        reload: fetchLeads,      // Función para recargar manualmente
        sortDescriptor,          // Estado del ordenamiento
        setSortDescriptor,       // Función para cambiar orden
    };
}