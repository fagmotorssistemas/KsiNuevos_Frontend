"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    RefreshCw,
    LayoutList,
    AlertTriangle,
    CalendarClock,
    HandCoins,
    Columns3,
    Table2,
} from "lucide-react";

import { KpiDashboard } from "@/components/features/accounting/wallet/KpiDashboard";
import { TopDebtorsTable } from "@/components/features/accounting/wallet/TopDebtorsTable";
import { AllDebtorsTable } from "@/components/features/accounting/wallet/AllDebtorsTable";
import { DebtorsKanbanBoard } from "@/components/features/accounting/wallet/DebtorsKanbanBoard";
import { ClientSearch } from "@/components/features/accounting/wallet/ClientSearch";
import { ClientDetail } from "@/components/features/accounting/wallet/ClientDetail";
import { useWalletData } from "@/hooks/accounting/useWalletData";
import { walletService } from "@/services/wallet.service";
import { ClienteDeudaSummary } from "@/types/wallet.types";

export default function WalletPage() {
    const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
    
    // 1. Agregamos 'mora' a las opciones de modo lista
    const [listMode, setListMode] = useState<'risk' | 'all' | 'mora'>('risk');
    const [boardView, setBoardView] = useState<'lista' | 'kanban'>('lista');
    const [soloSinGestion, setSoloSinGestion] = useState(true);
    
    const [filterMode, setFilterMode] = useState<'all' | 'vencidos' | 'aldia'>('all');
    
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [allDebtors, setAllDebtors] = useState<ClienteDeudaSummary[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);

    const { kpis, topDebtors, loading, refresh } = useWalletData();

    // 2. Cargar directorio para 'all', 'mora' o cuando se abre el kanban
    useEffect(() => {
        const needAll =
            listMode === 'all' ||
            listMode === 'mora' ||
            boardView === 'kanban';
        if (needAll && allDebtors.length === 0) {
            const fetchAll = async () => {
                setLoadingAll(true);
                try {
                    const data = await walletService.getAllDebtors(1000);
                    setAllDebtors(data);
                } catch (error) {
                    console.error("Error cargando directorio:", error);
                } finally {
                    setLoadingAll(false);
                }
            };
            fetchAll();
        }
    }, [listMode, boardView, allDebtors.length]);

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

    /** Base del kanban: preferir directorio completo; si aún no carga, top deudores. */
    const kanbanDebtors = useMemo(() => {
        const base = allDebtors.length > 0 ? allDebtors : topDebtors;
        if (filterMode === 'vencidos') return base.filter((d) => d.documentosVencidos > 0);
        if (filterMode === 'aldia') return base.filter((d) => d.documentosVencidos === 0);
        return base;
    }, [allDebtors, topDebtors, filterMode]);

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
        <div className="w-full mx-auto py-2">
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
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
                        <Link
                            href="/cartera-manual"
                            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 font-semibold text-sm shadow-sm whitespace-nowrap shrink-0 transition-colors"
                            title="Obligaciones registradas a mano (sin Oracle)"
                        >
                            <HandCoins className="h-5 w-5 shrink-0" />
                            Cartera manual
                        </Link>
                        <div className="w-full md:w-80 min-w-0">
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
                        {/* Barra de vistas: en flujo, sin absolute (evita solapamiento) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            {boardView === 'lista' ? (
                                <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-fit overflow-x-auto">
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
                            ) : (
                                <span className="text-xs text-slate-500">
                                    Tablero por días de mora
                                </span>
                            )}

                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                {boardView === 'kanban' && (
                                    <button
                                        type="button"
                                        onClick={() => setSoloSinGestion((v) => !v)}
                                        className={`h-9 px-3 rounded-lg text-xs font-bold border transition ${
                                            soloSinGestion
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        Sin gestión
                                    </button>
                                )}
                                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setBoardView('lista')}
                                        title="Vista lista"
                                        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-all ${
                                            boardView === 'lista'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Table2 className="h-3.5 w-3.5" />
                                        Lista
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBoardView('kanban')}
                                        title="Vista tablero"
                                        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-all ${
                                            boardView === 'kanban'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Columns3 className="h-3.5 w-3.5" />
                                        Tablero
                                    </button>
                                </div>
                            </div>
                        </div>

                        {boardView === 'lista' ? (
                            <>
                                {listMode === 'risk' && (
                                    <TopDebtorsTable
                                        debtors={topDebtors}
                                        onViewDetail={handleSelectClient}
                                        filterMode={filterMode}
                                        onFilterChange={setFilterMode}
                                    />
                                )}

                                {listMode === 'mora' && (
                                    <TopDebtorsTable
                                        debtors={debtorsByMora}
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
                            </>
                        ) : (
                            <DebtorsKanbanBoard
                                debtors={kanbanDebtors}
                                loading={loading || loadingAll}
                                onViewDetail={handleSelectClient}
                                soloSinGestion={soloSinGestion}
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