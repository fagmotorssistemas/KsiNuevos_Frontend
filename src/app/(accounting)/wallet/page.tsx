"use client";

import { useState } from "react";
import {
    KpiDashboard
} from "@/components/features/accounting/wallet/KpiDashboard";
import {
    TopDebtorsTable
} from "@/components/features/accounting/wallet/TopDebtorsTable";
import {
    ClientSearch
} from "@/components/features/accounting/wallet/ClientSearch";
import {
    ClientDetail
} from "@/components/features/accounting/wallet/ClientDetail";
import { useWalletData } from "@/hooks/accounting/useWalletData";

export default function WalletPage() {
    // Estado para controlar qué pantalla vemos: 'dashboard' o 'detail'
    const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

    // Nuestro hook personalizado que trae los datos
    const { kpis, topDebtors, loading, refresh } = useWalletData();

    // Manejador para cuando seleccionan un cliente (desde tabla o buscador)
    const handleSelectClient = (clientId: number) => {
        setSelectedClientId(clientId);
        setView('detail');
    };

    // Manejador para volver atrás
    const handleBack = () => {
        setView('dashboard');
        setSelectedClientId(null);
        // Opcional: refrescar datos al volver por si algo cambió
        // refresh(); 
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Título y Buscador Global */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Gestión de Cartera
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Monitoreo de cobranzas y cuentas por cobrar
                    </p>
                </div>

                {/* El buscador solo se muestra en el dashboard para no saturar el detalle */}
                {view === 'dashboard' && (
                    <div className="w-full md:w-auto">
                        <ClientSearch onSelectClient={handleSelectClient} />
                    </div>
                )}
            </div>

            {/* VISTA 1: DASHBOARD PRINCIPAL */}
            {view === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Sección de KPIs (Tarjetas de Colores) */}
                    <section>
                        <KpiDashboard data={kpis} loading={loading} />
                    </section>

                    {/* Sección de Tablas y Listados */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <TopDebtorsTable
                            debtors={topDebtors}
                            onViewDetail={handleSelectClient}
                        />
                    </section>
                </div>
            )}

            {/* VISTA 2: DETALLE DE CLIENTE */}
            {view === 'detail' && selectedClientId && (
                <ClientDetail
                    clientId={selectedClientId}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}