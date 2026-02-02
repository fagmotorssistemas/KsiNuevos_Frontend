"use client";

import { useState, useMemo } from "react";
import { RefreshCw, Wallet, ArrowLeft } from "lucide-react";
import { useCobrosData } from "@/hooks/accounting/useCobrosData";
import { CobrosKpiStats } from "@/components/features/accounting/cobros/CobrosKpiStats";
import { CobrosTable } from "@/components/features/accounting/cobros/CobrosTable";
import { CobrosFilters, CobrosFilterState, DateRangePreset, CobroPaymentType } from "@/components/features/accounting/cobros/CobrosFilters";
import { CobrosWizardSelection } from "@/components/features/accounting/cobros/CobrosWizardSelection";
import { ResumenCobros } from "@/types/cobros.types";

export default function CobrosPage() {
    const { data, loading, refresh } = useCobrosData();

    // Estado del Wizard
    const [wizardStep, setWizardStep] = useState<'TYPE' | 'DATE' | 'RESULTS'>('TYPE');
    const [showManualFilters, setShowManualFilters] = useState(false);

    // Estado de Filtros
    const [filters, setFilters] = useState<CobrosFilterState>({
        searchTerm: '',
        datePreset: 'MONTH',
        paymentType: 'ALL'
    });

    // --- MANEJADORES DEL WIZARD ---
    const handleTypeSelect = (type: CobroPaymentType) => {
        setFilters(prev => ({ ...prev, paymentType: type }));
        setWizardStep('DATE');
    };

    const handleDateSelect = (datePreset: DateRangePreset) => {
        setFilters(prev => ({ ...prev, datePreset }));
        setWizardStep('RESULTS');
    };

    const handleResetWizard = () => {
        setFilters({ searchTerm: '', datePreset: 'MONTH', paymentType: 'ALL' });
        setWizardStep('TYPE');
        setShowManualFilters(false);
    };

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

        // 2. Filtro Tipo de Pago
        if (filters.paymentType !== 'ALL') {
            cobrosFiltrados = cobrosFiltrados.filter(c => {
                const tipoRaw = (c.tipoPago || '').toUpperCase();
                
                switch (filters.paymentType) {
                    case 'DEPOSITOS':
                        return tipoRaw.includes('DEPOSITO') || tipoRaw.includes('DEPÓSITO');
                    case 'EFECTIVO':
                        return tipoRaw.includes('EFECTIVO');
                    case 'CRUCE_CUENTAS':
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
                case 'LAST_MONTH':
                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    endOfLastMonth.setHours(23, 59, 59, 999);
                    return cobroDate >= startOfLastMonth && cobroDate <= endOfLastMonth;
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
            totalMesActual: data.resumen.totalMesActual, // Mantenemos el original del mes para referencia
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

    // --- VISTA WIZARD ---
    if (wizardStep !== 'RESULTS') {
        return (
            <div className="min-h-screen bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                     <div className="flex justify-center items-center ">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Wallet className="h-6 w-6 text-red-500" />
                            Cobros
                        </h1>
                     </div>
                     
                     <CobrosWizardSelection 
                        step={wizardStep}
                        onSelectType={handleTypeSelect}
                        onSelectDate={handleDateSelect}
                        onBack={() => setWizardStep('TYPE')}
                     />
                </div>
            </div>
        );
    }

    // --- VISTA DE RESULTADOS ---
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
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
                        Cartera y Cobros
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Mostrando: <span className="font-semibold text-slate-700">
                            {filters.paymentType === 'ALL' ? 'Todos los métodos' : filters.paymentType}
                        </span>
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

                {/* Filtros Manuales Colapsables */}
                <CobrosFilters 
                    filters={filters} 
                    onChange={setFilters} 
                    isVisible={showManualFilters}
                    onToggle={() => setShowManualFilters(!showManualFilters)}
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
                    Mostrando {filteredData.listado.length} transacciones filtradas.
                    <br />
                    Fuente de datos: Módulo de Tesorería.
                </p>
            </div>
        </div>
    );
}