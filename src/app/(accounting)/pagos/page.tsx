"use client";

import { useState, useMemo } from "react";
import { RefreshCw, WalletCards, ArrowLeft } from "lucide-react";
import { usePagosData } from "@/hooks/accounting/usePagosData";
import { PagosKpiStats } from "@/components/features/accounting/pagos/PagosKpiStats";
import { PagosTable } from "@/components/features/accounting/pagos/PagosTable";
import { PagosFilters, PagosFilterState, GastoCategory, DateRangePreset } from "@/components/features/accounting/pagos/PagosFilters";
import { PagosWizardSelection } from "@/components/features/accounting/pagos/PagosWizardSelection";
import { ResumenPagos } from "@/types/pagos.types";

export default function PagosPage() {
    const { data, loading, refresh } = usePagosData();

    // Estado del "Mago" (Wizard Flow)
    const [wizardStep, setWizardStep] = useState<'CATEGORY' | 'DATE' | 'RESULTS'>('CATEGORY');
    
    // Control de visibilidad de filtros manuales en la vista de resultados
    const [showManualFilters, setShowManualFilters] = useState(false);

    // Estado de Filtros
    const [filters, setFilters] = useState<PagosFilterState>({
        searchTerm: '',
        datePreset: 'MONTH', // Default, pero será sobreescrito por el wizard
        category: 'ALL'
    });

    // --- MANEJADORES DEL WIZARD ---
    const handleCategorySelect = (category: GastoCategory) => {
        setFilters(prev => ({ ...prev, category }));
        setWizardStep('DATE');
    };

    const handleDateSelect = (datePreset: DateRangePreset) => {
        setFilters(prev => ({ ...prev, datePreset }));
        setWizardStep('RESULTS');
    };

    const handleResetWizard = () => {
        setFilters({ searchTerm: '', datePreset: 'MONTH', category: 'ALL' });
        setWizardStep('CATEGORY');
        setShowManualFilters(false);
    };

    // --- LÓGICA DE FILTRADO ---
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

        // 2. Filtro de Categoría (Lógica de Palabras Clave)
        if (filters.category !== 'ALL') {
            pagosFiltrados = pagosFiltrados.filter(p => {
                const concepto = (p.concepto || '').toUpperCase();
                
                const keywordsVehiculo = ['ENTREGA-RECEPCION', 'SE COMPRA', 'COMPRA DE VEHICULO', 'PARTE DE PAGO'];
                const keywordsMantenimiento = ['LATONERIA', 'MECANICA', 'ARREGLO', 'BATERIA', 'LAVAD', 'REPARACION', 'REPUESTOS'];
                const keywordsLegal = ['NOTARIA', 'LEGARIZACION', 'MATRICULA', 'LEGAL'];
                const keywordsServicios = ['SERVICIO', 'INFORMACION', 'COMPUTADORA', 'INTERNET', 'LUZ'];
                const keywordsFinanciero = ['PRESTAMO', 'TARJETA', 'SUELDO', 'SEGURO', 'CAPITAL', 'INTERES', 'T/C', 'CREDITO', 'COOPERATIVA', 'BANCO'];
                const keywordsCuv = ['CUV'];
                const keywordsSaldos = ['SALDO INICIAL', 'SALDOS INICIALES', 'SALDOS DE PROVEEDORES'];

                const matches = (keywords: string[]) => keywords.some(k => concepto.includes(k));

                switch (filters.category) {
                    case 'COMPRA_VEHICULO': return matches(keywordsVehiculo);
                    case 'MANTENIMIENTO': return matches(keywordsMantenimiento);
                    case 'LEGAL': return matches(keywordsLegal);
                    case 'SERVICIOS': return matches(keywordsServicios);
                    case 'FINANCIERO': return matches(keywordsFinanciero);
                    case 'CUV': return matches(keywordsCuv);
                    case 'SALDOS_INICIALES': return matches(keywordsSaldos);
                    case 'OTROS':
                        return !matches(keywordsVehiculo) && !matches(keywordsMantenimiento) &&
                               !matches(keywordsLegal) && !matches(keywordsServicios) &&
                               !matches(keywordsFinanciero) && !matches(keywordsCuv) && !matches(keywordsSaldos);
                    default: return true;
                }
            });
        }

        // 3. Filtro de Fechas (INCLUYE LÓGICA MES PASADO)
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
                case 'LAST_MONTH': // Lógica Mes Pasado
                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0); // Día 0 del mes actual es el último del anterior
                    endOfLastMonth.setHours(23, 59, 59, 999);
                    return pagoDate >= startOfLastMonth && pagoDate <= endOfLastMonth;
                case 'YEAR':
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return pagoDate >= startOfYear;
                case 'ALL':
                default:
                    return true;
            }
        });

        // 4. Recalcular KPIs
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

        return { listado: pagosFiltrados, resumen: resumenCalculado };

    }, [data, filters]);

    // --- VISTA DEL WIZARD (Pasos 1 y 2) ---
    if (wizardStep !== 'RESULTS') {
        return (
            <div className="min-h-screen bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-4 py-2">
                     <div className="flex justify-center mt-8">
                        <h1 className="text-xl font-bold text-slate-900 flex gap-2">
                            <WalletCards className="h-6 w-6 text-red-500" />
                            Pagos
                        </h1>
                     </div>
                     
                     <PagosWizardSelection 
                        step={wizardStep}
                        onSelectCategory={handleCategorySelect}
                        onSelectDate={handleDateSelect}
                        onBack={() => setWizardStep('CATEGORY')}
                     />
                </div>
            </div>
        );
    }

    // --- VISTA DE RESULTADOS (Dashboard) ---
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Cabecera de Resultados */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button 
                        onClick={handleResetWizard}
                        className="group flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-1 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Reiniciar Asistente
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Resultados de Búsqueda
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Mostrando: <span className="font-semibold text-slate-700">{filters.category === 'ALL' ? 'Todas las categorías' : filters.category}</span>
                        {' • '}
                        Periodo: <span className="font-semibold text-slate-700">{filters.datePreset}</span>
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
                
                {/* Botón para desplegar filtros manuales si el usuario quiere cambiar algo */}
                <PagosFilters 
                    filters={filters} 
                    onChange={setFilters}
                    isVisible={showManualFilters}
                    onToggle={() => setShowManualFilters(!showManualFilters)}
                />

                {/* 1. Dashboard de Métricas */}
                <PagosKpiStats 
                    data={loading ? null : filteredData.resumen} 
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
                        <PagosTable pagos={filteredData.listado} />
                    )}
                </div>
            </div>
            
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400">
                    Fuente: Módulo de Proveedores. Categorización automática.
                 </p>
            </div>
        </div>
    );
}