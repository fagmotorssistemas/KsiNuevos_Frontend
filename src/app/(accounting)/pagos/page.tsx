"use client";

import { useState, useMemo } from "react";
import { RefreshCw, WalletCards } from "lucide-react";
import { usePagosData } from "@/hooks/accounting/usePagosData";
import { PagosKpiStats } from "@/components/features/accounting/pagos/PagosKpiStats";
import { PagosTable } from "@/components/features/accounting/pagos/PagosTable";
import { PagosFilters, PagosFilterState } from "@/components/features/accounting/pagos/PagosFilters";
import { ResumenPagos } from "@/types/pagos.types";

export default function PagosPage() {
    const { data, loading, refresh } = usePagosData();

    // Estado de Filtros
    const [filters, setFilters] = useState<PagosFilterState>({
        searchTerm: '',
        datePreset: 'MONTH',
        category: 'ALL'
    });

    // Lógica de Filtrado Inteligente
    const filteredData = useMemo(() => {
        if (!data) return { listado: [], resumen: null };

        let pagosFiltrados = [...data.listado];

        // 1. Filtro de Texto Universal
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            pagosFiltrados = pagosFiltrados.filter(p => 
                p.proveedor.toLowerCase().includes(term) ||
                (p.concepto && p.concepto.toLowerCase().includes(term)) ||
                (p.comprobante && p.comprobante.toLowerCase().includes(term)) ||
                (p.documentoTransaccion && p.documentoTransaccion.toLowerCase().includes(term))
            );
        }

        // 2. Filtro de Categoría (Lógica de Palabras Clave Ampliada)
        if (filters.category !== 'ALL') {
            pagosFiltrados = pagosFiltrados.filter(p => {
                const concepto = (p.concepto || '').toUpperCase();
                
                // Definición de Palabras Clave (Keywords)
                
                const keywordsVehiculo = ['ENTREGA-RECEPCION', 'SE COMPRA', 'COMPRA DE VEHICULO', 'PARTE DE PAGO'];
                
                const keywordsMantenimiento = ['LATONERIA', 'MECANICA', 'ARREGLO', 'BATERIA', 'LAVAD', 'REPARACION', 'REPUESTOS'];
                
                const keywordsLegal = ['NOTARIA', 'LEGARIZACION', 'MATRICULA', 'LEGAL'];
                
                const keywordsServicios = ['SERVICIO', 'INFORMACION', 'COMPUTADORA', 'INTERNET', 'LUZ'];
                
                // Financiero: Agregamos T/C, CREDITO, COOPERATIVA
                const keywordsFinanciero = [
                    'PRESTAMO', 'TARJETA', 'SUELDO', 'SEGURO', 'CAPITAL', 'INTERES', 
                    'T/C', 'CREDITO', 'COOPERATIVA', 'BANCO'
                ];
                
                // Nuevas Categorías
                const keywordsCuv = ['CUV'];
                
                const keywordsSaldos = ['SALDO INICIAL', 'SALDOS INICIALES', 'SALDOS DE PROVEEDORES'];

                // Helper para verificar coincidencias
                const matches = (keywords: string[]) => keywords.some(k => concepto.includes(k));

                switch (filters.category) {
                    case 'COMPRA_VEHICULO':
                        return matches(keywordsVehiculo);
                    
                    case 'MANTENIMIENTO':
                        return matches(keywordsMantenimiento);

                    case 'LEGAL':
                        return matches(keywordsLegal);

                    case 'SERVICIOS':
                        return matches(keywordsServicios);

                    case 'FINANCIERO':
                        return matches(keywordsFinanciero);

                    case 'CUV':
                        return matches(keywordsCuv);

                    case 'SALDOS_INICIALES':
                        return matches(keywordsSaldos);
                    
                    case 'OTROS':
                        // OTROS excluye TODAS las categorías anteriores
                        return !matches(keywordsVehiculo) &&
                               !matches(keywordsMantenimiento) &&
                               !matches(keywordsLegal) &&
                               !matches(keywordsServicios) &&
                               !matches(keywordsFinanciero) &&
                               !matches(keywordsCuv) &&
                               !matches(keywordsSaldos);

                    default:
                        return true;
                }
            });
        }

        // 3. Filtro de Fechas
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        pagosFiltrados = pagosFiltrados.filter(p => {
            const pagoDate = new Date(p.fecha);
            
            switch (filters.datePreset) {
                case 'TODAY':
                    return pagoDate >= startOfDay;
                case 'WEEK':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    return pagoDate >= startOfWeek;
                case 'MONTH':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    return pagoDate >= startOfMonth;
                case 'YEAR':
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return pagoDate >= startOfYear;
                case 'ALL':
                default:
                    return true;
            }
        });

        // 4. Recalcular KPIs dinámicos
        let nuevoProveedorTop = data.resumen.proveedorMasFrecuente;
        let totalPorVencerCalculado = 0;
        
        if (pagosFiltrados.length > 0) {
            const conteoProveedores: Record<string, number> = {};
            pagosFiltrados.forEach(p => {
                conteoProveedores[p.proveedor] = (conteoProveedores[p.proveedor] || 0) + 1;
                if (p.fechaVencimiento && new Date(p.fechaVencimiento) < now) {
                    totalPorVencerCalculado += p.monto;
                }
            });
            nuevoProveedorTop = Object.entries(conteoProveedores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        } else {
            nuevoProveedorTop = "Sin datos";
        }

        const resumenCalculado: ResumenPagos = {
            totalPagado: pagosFiltrados.reduce((sum, p) => sum + p.monto, 0),
            totalPorVencer: totalPorVencerCalculado,
            proveedorMasFrecuente: nuevoProveedorTop,
            cantidadTransacciones: pagosFiltrados.length,
            fechaActualizacion: new Date().toISOString()
        };

        return {
            listado: pagosFiltrados,
            resumen: resumenCalculado
        };

    }, [data, filters]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Cuentas por Pagar
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <WalletCards className="h-3.5 w-3.5 text-blue-500" />
                        Control de proveedores, facturas y vencimientos (KSI_PAGOS_PROV_V)
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Datos
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Filtros Inteligentes */}
                <PagosFilters 
                    filters={filters} 
                    onChange={setFilters} 
                />

                {/* 1. Dashboard de Métricas (Recalculadas) */}
                <PagosKpiStats 
                    data={loading ? null : filteredData.resumen} 
                    loading={loading} 
                />

                {/* 2. Listado Detallado (Filtrado) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                         <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                         </div>
                    ) : (
                        <PagosTable pagos={filteredData.listado} />
                    )}
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400">
                    Fuente: Módulo de Proveedores.
                    <br />
                    Categorización automática basada en el concepto de la transacción.
                 </p>
            </div>
        </div>
    );
}