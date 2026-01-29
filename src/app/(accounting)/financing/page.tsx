"use client";

import { useState, useMemo } from "react";
import { RefreshCw, PieChart } from "lucide-react";
import { useFinanzasData } from "@/hooks/accounting/useFinanzasData";
import { FinanzasKpiStats } from "@/components/features/accounting/financing/FinanzasKpiStats";
import { FinanzasTable } from "@/components/features/accounting/financing/FinanzasTable";
import { FinanzasFilters, FilterState } from "@/components/features/accounting/financing/FinanzasFilters";
import { ResumenFinanciero } from "@/types/finanzas.types";

export default function FinanzasPage() {
    const { data, loading, refresh } = useFinanzasData();

    // Estado de Filtros
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        type: 'ALL',
        datePreset: 'MONTH' // Por defecto mostramos el mes actual
    });

    // Lógica de Filtrado y Recálculo de Datos
    const filteredData = useMemo(() => {
        if (!data) return { movimientos: [], resumen: null };

        let movimientosFiltrados = [...data.ultimosMovimientos];

        // 1. Filtrar por Término de Búsqueda
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            movimientosFiltrados = movimientosFiltrados.filter(m => 
                m.concepto.toLowerCase().includes(term) ||
                m.beneficiario.toLowerCase().includes(term) ||
                m.documento.toLowerCase().includes(term)
            );
        }

        // 2. Filtrar por Tipo (Ingreso/Egreso)
        if (filters.type !== 'ALL') {
            movimientosFiltrados = movimientosFiltrados.filter(m => m.tipoMovimiento === filters.type);
        }

        // 3. Filtrar por Fecha
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        movimientosFiltrados = movimientosFiltrados.filter(m => {
            const movDate = new Date(m.fecha);
            
            switch (filters.datePreset) {
                case 'TODAY':
                    return movDate >= startOfDay;
                case 'WEEK':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo como inicio
                    startOfWeek.setHours(0, 0, 0, 0);
                    return movDate >= startOfWeek;
                case 'MONTH':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    return movDate >= startOfMonth;
                case 'YEAR':
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return movDate >= startOfYear;
                case 'ALL':
                default:
                    return true;
            }
        });

        // 4. Recalcular KPIs basados en los datos filtrados
        const resumenCalculado: ResumenFinanciero = movimientosFiltrados.reduce((acc, curr) => {
            if (curr.tipoMovimiento === 'INGRESO') {
                acc.totalIngresos += curr.monto;
                acc.balanceNeto += curr.monto;
            } else {
                acc.totalEgresos += curr.monto;
                acc.balanceNeto -= curr.monto;
            }
            acc.cantidadMovimientos++;
            return acc;
        }, {
            totalIngresos: 0,
            totalEgresos: 0,
            balanceNeto: 0,
            cantidadMovimientos: 0,
            fechaActualizacion: new Date().toISOString() // Corrección: Propiedad agregada
        } as ResumenFinanciero);

        return {
            movimientos: movimientosFiltrados,
            resumen: resumenCalculado
        };

    }, [data, filters]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Estado Financiero
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <PieChart className="h-3.5 w-3.5 text-blue-500" />
                        Control de ingresos, egresos y balance contable
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Balance
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Componente de Filtros Nuevo */}
                <FinanzasFilters 
                    filters={filters} 
                    onChange={setFilters} 
                />

                {/* 1. KPIs Financieros (Recalculados dinámicamente) */}
                <FinanzasKpiStats 
                    data={loading ? null : filteredData.resumen} 
                    loading={loading} 
                />

                {/* 2. Listado de Movimientos (Filtrado) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                         <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                         </div>
                    ) : (
                        <FinanzasTable movimientos={filteredData.movimientos} />
                    )}
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400">
                    Mostrando {filteredData.movimientos.length} movimientos según filtros aplicados.
                    <br />
                    Cálculos basados en contabilidad oficial. (DATA_USR.CCOMPROBA)
                 </p>
            </div>
        </div>
    );
}