"use client";

import { useState, useMemo } from "react";
import { RefreshCw, FileText } from "lucide-react";
import { useCobrosData } from "@/hooks/accounting/useCobrosData";
import { CobrosKpiStats } from "@/components/features/accounting/cobros/CobrosKpiStats";
import { CobrosTable } from "@/components/features/accounting/cobros/CobrosTable";
import { CobrosFilters, CobrosFilterState } from "@/components/features/accounting/cobros/CobrosFilters";
import { ResumenCobros } from "@/types/cobros.types";

export default function CobrosPage() {
    const { data, loading, refresh } = useCobrosData();

    // Estado de Filtros
    const [filters, setFilters] = useState<CobrosFilterState>({
        searchTerm: '',
        datePreset: 'MONTH',
        paymentType: 'ALL'
    });

    // CORRECCIÓN: Definimos categorías limpias en lugar de usar los datos crudos
    const availablePaymentTypes = ['DEPOSITOS', 'EFECTIVO', 'CRUCE DE CUENTAS'];

    // Lógica de Filtrado y Recálculo (Memoizada)
    const filteredData = useMemo(() => {
        if (!data) return { listado: [], resumen: null };

        let cobrosFiltrados = [...data.listado];

        // 1. Filtro Texto
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            cobrosFiltrados = cobrosFiltrados.filter(c => 
                c.cliente.toLowerCase().includes(term) ||
                (c.concepto && c.concepto.toLowerCase().includes(term)) ||
                (c.comprobantePago && c.comprobantePago.toLowerCase().includes(term)) ||
                (c.vehiculo && c.vehiculo.toLowerCase().includes(term))
            );
        }

        // 2. Filtro Tipo de Pago (Lógica de Agrupación)
        if (filters.paymentType !== 'ALL') {
            cobrosFiltrados = cobrosFiltrados.filter(c => {
                const tipoRaw = (c.tipoPago || '').toUpperCase();
                
                // Mapeo inteligente: Si contiene la palabra clave, pertenece a la categoría
                switch (filters.paymentType) {
                    case 'DEPOSITOS':
                        return tipoRaw.includes('DEPOSITO') || tipoRaw.includes('DEPÓSITO');
                    case 'EFECTIVO':
                        return tipoRaw.includes('EFECTIVO');
                    case 'CRUCE DE CUENTAS':
                        return tipoRaw.includes('CRUCE') || tipoRaw.includes('DOCUMENTARIO');
                    default:
                        return true;
                }
            });
        }

        // 3. Filtro de Fechas
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        cobrosFiltrados = cobrosFiltrados.filter(c => {
            const cobroDate = new Date(c.fechaPago);
            
            switch (filters.datePreset) {
                case 'TODAY':
                    return cobroDate >= startOfDay;
                case 'WEEK':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    return cobroDate >= startOfWeek;
                case 'MONTH':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    return cobroDate >= startOfMonth;
                case 'YEAR':
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return cobroDate >= startOfYear;
                case 'ALL':
                default:
                    return true;
            }
        });

        // 4. Recalcular KPIs
        const nuevaDistribucion: Record<string, number> = {};
        cobrosFiltrados.forEach(c => {
            // Para la gráfica, intentamos agrupar también para que se vea limpio
            let categoriaGrafica = c.tipoPago;
            const tipoRaw = (c.tipoPago || '').toUpperCase();
            
            if (tipoRaw.includes('DEPOSITO')) categoriaGrafica = 'DEPOSITOS';
            else if (tipoRaw.includes('EFECTIVO')) categoriaGrafica = 'EFECTIVO';
            else if (tipoRaw.includes('CRUCE')) categoriaGrafica = 'CRUCE DE CUENTAS';
            
            if (categoriaGrafica) {
                nuevaDistribucion[categoriaGrafica] = (nuevaDistribucion[categoriaGrafica] || 0) + c.valorPagado;
            }
        });

        // Encontrar fecha más reciente
        let fechaMasRecienteFiltrada = data.resumen.cobroMasReciente;
        if (cobrosFiltrados.length > 0) {
            const masReciente = cobrosFiltrados.reduce((max, current) => 
                new Date(current.fechaPago) > new Date(max.fechaPago) ? current : max
            , cobrosFiltrados[0]);
            fechaMasRecienteFiltrada = masReciente.fechaPago;
        }

        const resumenCalculado: ResumenCobros = {
            totalRecaudado: cobrosFiltrados.reduce((sum, c) => sum + c.valorPagado, 0),
            totalMesActual: data.resumen.totalMesActual, 
            cantidadTransacciones: cobrosFiltrados.length,
            distribucionPorTipo: nuevaDistribucion,
            cobroMasReciente: fechaMasRecienteFiltrada,
            fechaActualizacion: new Date().toISOString()
        };

        return {
            listado: cobrosFiltrados,
            resumen: resumenCalculado
        };

    }, [data, filters]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Cartera y Cobros
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-red-500" />
                        Registro histórico de pagos y abonos de clientes
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Pagos
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Componente de Filtros */}
                <CobrosFilters 
                    filters={filters} 
                    onChange={setFilters} 
                    availableTypes={availablePaymentTypes}
                />

                {/* 1. KPIs */}
                <CobrosKpiStats
                    data={loading ? null : filteredData.resumen}
                    loading={loading}
                />

                {/* 2. Tabla Detallada */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                        </div>
                    ) : (
                        <CobrosTable cobros={filteredData.listado} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Mostrando {filteredData.listado.length} transacciones.
                    <br />
                    Fuente de datos: Vista KS_COBROS_V.
                </p>
            </div>
        </div>
    );
}