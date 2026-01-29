"use client";

import { useState, useMemo } from "react";
import { RefreshCw, LayoutGrid, FileSpreadsheet } from "lucide-react";
import { useVentasData } from "@/hooks/accounting/useVentasData";
import { VentasKpiStats } from "@/components/features/accounting/salesreport/VentasKpiStats";
import { VentasTable } from "@/components/features/accounting/salesreport/VentasTable";
import { VentasFilters, FilterState, DateRangePreset } from "@/components/features/accounting/salesreport/VentasFilters";
import { ResumenVentas, VentaVehiculo } from "@/types/ventas.types";

export default function VentasPage() {
    const { data, loading, refresh } = useVentasData();

    // Estado inicial de los filtros
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        brand: 'all',
        agency: 'all',
        salesperson: 'all',
        datePreset: 'this_month' // Por defecto mostramos el mes actual, más útil
    });

    // --- LÓGICA DE FILTRADO ---
    
    // 1. Extraer opciones únicas para los dropdowns (Memoizado para rendimiento)
    const options = useMemo(() => {
        if (!data?.listado) return { brands: [], agencies: [], agents: [] };
        
        const brands = Array.from(new Set(data.listado.map(v => v.marca))).sort();
        const agencies = Array.from(new Set(data.listado.map(v => v.agencia))).sort();
        const agents = Array.from(new Set(data.listado.map(v => v.agenteVenta))).sort();

        return { brands, agencies, agents };
    }, [data]);

    // 2. Filtrar los datos
    const filteredData = useMemo(() => {
        if (!data?.listado) return [];

        return data.listado.filter(venta => {
            // A. Filtro por Texto (Búsqueda global)
            const searchText = filters.search.toLowerCase();
            const matchesSearch = 
                venta.producto.toLowerCase().includes(searchText) ||
                venta.modelo.toLowerCase().includes(searchText) ||
                venta.rucCedulaCliente.includes(searchText) ||
                venta.chasis.toLowerCase().includes(searchText) ||
                (venta.agenteVenta && venta.agenteVenta.toLowerCase().includes(searchText));

            if (!matchesSearch) return false;

            // B. Filtros de Selectores
            if (filters.brand !== 'all' && venta.marca !== filters.brand) return false;
            if (filters.agency !== 'all' && venta.agencia !== filters.agency) return false;
            if (filters.salesperson !== 'all' && venta.agenteVenta !== filters.salesperson) return false;

            // C. Filtro de Fechas Avanzado
            if (filters.datePreset !== 'all') {
                const ventaDate = new Date(venta.fecha);
                const today = new Date();
                today.setHours(0,0,0,0); // Normalizar a medianoche

                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lunes

                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                
                switch (filters.datePreset) {
                    case 'today':
                        if (ventaDate.toDateString() !== today.toDateString()) return false;
                        break;
                    case 'yesterday':
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (ventaDate.toDateString() !== yesterday.toDateString()) return false;
                        break;
                    case 'this_week':
                        if (ventaDate < startOfWeek) return false;
                        break;
                    case 'this_month':
                        if (ventaDate < startOfMonth) return false;
                        if (ventaDate.getMonth() !== today.getMonth()) return false;
                        break;
                    case 'last_month':
                        const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                        if (ventaDate < startLastMonth || ventaDate > endLastMonth) return false;
                        break;
                }
            }

            return true;
        });
    }, [data, filters]);

    // 3. Recalcular KPIs basados en los datos filtrados (Next Level Feature)
    const calculatedStats: ResumenVentas | null = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return null;

        const totalUnidades = filteredData.length;
        
        // Calcular ventas del mes actual dentro del set filtrado
        const now = new Date();
        const ventasMes = filteredData.filter(v => {
            const d = new Date(v.fecha);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        // Calcular Top Marca del set filtrado
        const marcaCounts: Record<string, number> = {};
        filteredData.forEach(v => {
            marcaCounts[v.marca] = (marcaCounts[v.marca] || 0) + 1;
        });
        const topMarca = Object.entries(marcaCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';

        // Calcular Distribución por Tipo
        const distribucion: Record<string, number> = {};
        filteredData.forEach(v => {
            // Usamos tipoProducto o tipoVehiculo según disponibilidad
            const tipo = v.tipoVehiculo || v.tipoProducto || 'Otros';
            distribucion[tipo] = (distribucion[tipo] || 0) + 1;
        });

        return {
            totalUnidadesVendidas: totalUnidades,
            totalVentasMesActual: ventasMes,
            topMarca: topMarca,
            distribucionPorTipo: distribucion,
            fechaActualizacion: new Date().toISOString()
        };
    }, [filteredData]);

    // Handlers
    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            brand: 'all',
            agency: 'all',
            salesperson: 'all',
            datePreset: 'all'
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Reporte Comercial Vehículos
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                        Seguimiento de entregas, stock y rendimiento de agentes
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Actualizar
                    </button>
                    {/* Botón extra ficticio para Exportar (mejora visual)
                    <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Exportar
                    </button> */}
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* FILTROS NUEVOS */}
                <VentasFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    availableBrands={options.brands}
                    availableAgencies={options.agencies}
                    availableAgents={options.agents}
                />

                {/* 1. Dashboard de Métricas (Usa calculatedStats para ser reactivo) */}
                <VentasKpiStats
                    data={calculatedStats || (data ? data.resumen : null)}
                    loading={loading}
                />

                {/* 2. Listado Detallado */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                        </div>
                    ) : (
                        <VentasTable ventas={filteredData} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center pb-8">
                <p className="text-xs text-slate-400">
                    Fuente: DATA_USR.REPORTE_VENTAS_VEHICULOS
                    <br />
                    Los datos representan facturación cerrada y vehículos entregados.
                </p>
            </div>
        </div>
    );
}