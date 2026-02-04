"use client";

import { useState, useMemo } from "react";
import { RefreshCw, ClipboardList } from "lucide-react";
import { useInventarioData } from "@/hooks/accounting/useInventarioData";
import { InventarioKpiStats, FilterType } from "@/components/features/inventario/InventarioKpiStats";
import { InventarioTable } from "@/components/features/inventario/InventarioTable";

export default function InventarioPage() {
    const { data, loading, refresh } = useInventarioData();
    
    // Estado para el filtro (Por defecto 'all')
    const [filter, setFilter] = useState<FilterType>('all');

    // Lógica de filtrado dinámico
    const filteredList = useMemo(() => {
        if (!data?.listado) return [];

        switch (filter) {
            case 'active':
                // Solo vehículos con stock > 0
                return data.listado.filter(v => v.stock > 0);
            case 'baja':
                // Solo vehículos con stock == 0
                return data.listado.filter(v => v.stock === 0);
            case 'all':
            default:
                // Todos
                return data.listado;
        }
    }, [data, filter]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Inventario General
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                        Control detallado de flota vehicular (ksi_vehiculos_v)
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={refresh}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Actualizar datos"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* 1. KPIs Interactivos (Funcionan como Filtros) */}
                <InventarioKpiStats 
                    data={data ? data.resumen : null} 
                    loading={loading}
                    activeFilter={filter}
                    onFilterChange={setFilter}
                />

                {/* 2. Tabla Maestra de Inventario */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                         <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                         </div>
                    ) : (
                        // Pasamos la lista YA filtrada a la tabla
                        <InventarioTable vehiculos={filteredList} />
                    )}
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400">
                    Los campos marcados como <span className="text-red-500 italic">"No especificado"</span> requieren revisión en el sistema de origen.
                    <br />
                    Stock 0 indica vehículos dados de baja o vendidos.
                 </p>
            </div>
        </div>
    );
}