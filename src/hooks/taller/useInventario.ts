import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { InventarioItem } from "@/types/taller";

export function useInventario() {
    const { supabase } = useAuth();
    const [items, setItems] = useState<InventarioItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('taller_inventario_items')
                .select('*')
                .order('nombre', { ascending: true });
            
            if (error) throw error;
            setItems(data as InventarioItem[]);
        } catch (error) {
            console.error("Error cargando inventario:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const crearItem = async (item: Omit<InventarioItem, 'id'>) => {
        try {
            const { error } = await supabase
                .from('taller_inventario_items')
                .insert([item]);
            
            if (error) throw error;
            await fetchItems(); // Recargar lista
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const actualizarItem = async (id: string, updates: Partial<InventarioItem>) => {
        try {
            const { error } = await supabase
                .from('taller_inventario_items')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchItems();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchItems();
    }, [supabase]);

    return {
        items,
        isLoading,
        crearItem,
        actualizarItem,
        refresh: fetchItems
    };
}