"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, LayoutList, AlertTriangle, CalendarClock } from "lucide-react"; // Importamos icono nuevo

import { KpiDashboard } from "@/components/features/accounting/wallet/KpiDashboard";
import { TopDebtorsTable } from "@/components/features/accounting/wallet/TopDebtorsTable";
import { AllDebtorsTable } from "@/components/features/accounting/wallet/AllDebtorsTable";
import { ClientSearch } from "@/components/features/accounting/wallet/ClientSearch";
import { ClientDetail } from "@/components/features/accounting/wallet/ClientDetail";
import { useWalletData } from "@/hooks/accounting/useWalletData";
import { walletService } from "@/services/wallet.service";
import { ClienteDeudaSummary } from "@/types/wallet.types";

export default function WalletPage() {
    const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
    
    // 1. Agregamos 'mora' a las opciones de modo lista
    const [listMode, setListMode] = useState<'risk' | 'all' | 'mora'>('risk');
    
    const [filterMode, setFilterMode] = useState<'all' | 'vencidos' | 'aldia'>('all');
    
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [allDebtors, setAllDebtors] = useState<ClienteDeudaSummary[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);

    const { kpis, topDebtors, loading, refresh } = useWalletData();

    // 2. Modificamos el efecto para cargar datos si es 'all' O 'mora'
    useEffect(() => {
        if ((listMode === 'all' || listMode === 'mora') && allDebtors.length === 0) {
            const fetchAll = async () => {
                setLoadingAll(true);
                try {
                    const data = await walletService.getAllDebtors(100);
                    setAllDebtors(data);
                } catch (error) {
                    console.error("Error cargando directorio:", error);
                } finally {
                    setLoadingAll(false);
                }
            };
            fetchAll();
        }
    }, [listMode]); // Se ejecuta cuando cambia el modo

    // 3. Función especial para manejar el click en "Mayor Mora"
    const handleMoraViewClick = () => {
        setListMode('mora');
        // AQUÍ ESTÁ LA MAGIA: Forzamos el filtro a 'vencidos' automáticamente
        setFilterMode('vencidos');
    };

    // 4. Preparamos los datos ordenados usando useMemo para no re-ordenar en cada render
    const debtorsByMora = useMemo(() => {
        if (listMode !== 'mora') return [];
        // Creamos una copia [...] para no mutar el array original y ordenamos
        return [...allDebtors].sort((a, b) => b.diasMoraMaximo - a.diasMoraMaximo);
    }, [allDebtors, listMode]);

    const handleSelectClient = (clientId: number) => {
        setSelectedClientId(clientId);
        setView('detail');
    };

    const handleBack = () => {
        setView('dashboard');
        setSelectedClientId(null);
        refresh(); 
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Gestión de Cartera
                        {(loading || loadingAll) && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Centro de comando de cobranzas y recuperación
                    </p>
                </div>

                {view === 'dashboard' && (
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="w-full md:w-80">
                            <ClientSearch onSelectClient={handleSelectClient} />
                        </div>
                    </div>
                )}
            </div>

            {view === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    
                    <KpiDashboard 
                        data={kpis} 
                        loading={loading}
                        currentFilter={filterMode}     
                        onFilterChange={setFilterMode} 
                    />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        
                        {/* Controles de Pestaña (Tabs) */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-fit overflow-x-auto">
                                {/* Botón 1: Prioridad */}
                                <button
                                    onClick={() => setListMode('risk')}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                        listMode === 'risk'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <AlertTriangle className={`h-4 w-4 ${listMode === 'risk' ? 'text-red-500' : ''}`} />
                                    Prioridad Alta
                                </button>

                                {/* Botón 2: NUEVO - Mayor Mora */}
                                <button
                                    onClick={handleMoraViewClick}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                        listMode === 'mora'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <CalendarClock className={`h-4 w-4 ${listMode === 'mora' ? 'text-orange-500' : ''}`} />
                                    Mayor Mora
                                </button>

                                {/* Botón 3: Directorio */}
                                <button
                                    onClick={() => setListMode('all')}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                        listMode === 'all'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <LayoutList className={`h-4 w-4 ${listMode === 'all' ? 'text-blue-500' : ''}`} />
                                    Directorio A-Z
                                </button>
                            </div>
                        </div>

                        {/* Renderizado Condicional de Tablas */}
                        {listMode === 'risk' && (
                            <TopDebtorsTable
                                debtors={topDebtors}
                                onViewDetail={handleSelectClient}
                                filterMode={filterMode}
                                onFilterChange={setFilterMode}
                            />
                        )}

                        {/* Reutilizamos TopDebtorsTable para la vista de Mora porque queremos ver los indicadores de riesgo */}
                        {listMode === 'mora' && (
                            <TopDebtorsTable
                                debtors={debtorsByMora} // Pasamos la lista ordenada
                                onViewDetail={handleSelectClient}
                                filterMode={filterMode}
                                onFilterChange={setFilterMode}
                            />
                        )}

                        {listMode === 'all' && (
                            <AllDebtorsTable 
                                debtors={allDebtors}
                                onViewDetail={handleSelectClient}
                                loading={loadingAll}
                                filterMode={filterMode}
                                onFilterChange={setFilterMode}
                            />
                        )}
                    </div>
                </div>
            )}

            {view === 'detail' && selectedClientId && (
                <ClientDetail
                    clientId={selectedClientId}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}