"use client";

import { useState, useEffect } from "react";
import { RefreshCw, LayoutList, AlertTriangle } from "lucide-react";

import { KpiDashboard } from "@/components/features/accounting/wallet/KpiDashboard";
import { TopDebtorsTable } from "@/components/features/accounting/wallet/TopDebtorsTable";
import { AllDebtorsTable } from "@/components/features/accounting/wallet/AllDebtorsTable"; // Importamos la nueva tabla
import { ClientSearch } from "@/components/features/accounting/wallet/ClientSearch";
import { ClientDetail } from "@/components/features/accounting/wallet/ClientDetail";
import { useWalletData } from "@/hooks/accounting/useWalletData";
import { Button } from "@/components/ui/Button"; 
import { walletService } from "@/services/wallet.service";
import { ClienteDeudaSummary } from "@/types/wallet.types";

export default function WalletPage() {
    // view: controla si vemos el dashboard o el detalle de un cliente
    const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
    // listMode: controla qué tabla vemos en el dashboard (Top Riesgo o Todos)
    const [listMode, setListMode] = useState<'risk' | 'all'>('risk');
    
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    
    // Estado local para la lista completa (ya que el hook useWalletData solo trae el top)
    const [allDebtors, setAllDebtors] = useState<ClienteDeudaSummary[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);

    const { kpis, topDebtors, loading, refresh } = useWalletData();

    // Efecto para cargar la lista completa cuando el usuario cambia de pestaña
    useEffect(() => {
        if (listMode === 'all' && allDebtors.length === 0) {
            const fetchAll = async () => {
                setLoadingAll(true);
                try {
                    const data = await walletService.getAllDebtors(100); // Traemos 100 por defecto
                    setAllDebtors(data);
                } catch (error) {
                    console.error("Error cargando directorio:", error);
                } finally {
                    setLoadingAll(false);
                }
            };
            fetchAll();
        }
    }, [listMode]);

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
            {/* Cabecera Principal */}
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

            {/* VISTA 1: DASHBOARD */}
            {view === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    
                    {/* KPIs siempre visibles */}
                    <KpiDashboard data={kpis} loading={loading} />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        
                        {/* Controles de Pestaña (Tabs) */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                                <button
                                    onClick={() => setListMode('risk')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                        listMode === 'risk'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <AlertTriangle className={`h-4 w-4 ${listMode === 'risk' ? 'text-red-500' : ''}`} />
                                    Prioridad Alta
                                </button>
                                <button
                                    onClick={() => setListMode('all')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
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
                        {listMode === 'risk' ? (
                            <TopDebtorsTable
                                debtors={topDebtors}
                                onViewDetail={handleSelectClient}
                            />
                        ) : (
                            <AllDebtorsTable 
                                debtors={allDebtors}
                                onViewDetail={handleSelectClient}
                                loading={loadingAll}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* VISTA 2: DETALLE */}
            {view === 'detail' && selectedClientId && (
                <ClientDetail
                    clientId={selectedClientId}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}