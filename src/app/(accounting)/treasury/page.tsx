"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { useTreasuryData } from "@/hooks/accounting/useTreasuryData";
import { TreasuryKpiStats } from "@/components/features/accounting/treasury/TreasuryKpiStats";
import { BankAccountsTable } from "@/components/features/accounting/treasury/BankAccountsTable";

export default function TreasuryPage() {
    const { data, loading, refresh } = useTreasuryData();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Tesorería General
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Visión consolidada de liquidez bancaria (Empresa #162)
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Saldos
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* 1. KPIs Superiores */}
                <TreasuryKpiStats 
                    data={data ? data.resumen : null} 
                    loading={loading} 
                />

                {/* 2. Tabla de Bancos */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                         <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                         </div>
                    ) : (
                        <BankAccountsTable accounts={data?.cuentasBancarias || []} />
                    )}
                </div>
            </div>
            
            {/* Footer Informativo */}
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400">
                    Datos sincronizados directamente desde el sistema contable Oracle.
                    <br />
                    Los saldos reflejan el acumulado contable del año fiscal en curso.
                 </p>
            </div>
        </div>
    );
}