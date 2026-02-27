"use client";

import { useState } from "react";
import { Plus, LayoutDashboard, CalendarClock, HandCoins } from "lucide-react";
import { useFinanzas } from "@/hooks/taller/useFinanzas";
import { AccountsHeader } from "@/components/features/taller/finanzas/AccountsHeader";
import { TransactionTable } from "@/components/features/taller/finanzas/TransactionTable";
import { TransactionModal } from "@/components/features/taller/finanzas/TransactionModal";
import { CreateAccountModal } from "@/components/features/taller/finanzas/CreateAccountModal";
import { GastosManager } from "@/components/features/taller/finanzas/GastosManager";
import { CuentasPorCobrar } from "@/components/features/taller/finanzas/CuentasPorCobrar";

type TabType = 'todo' | 'obligaciones' | 'cobrar';

export default function FinanzasPage() {
    const { 
        cuentas, 
        transacciones, 
        cuentasPorCobrar, 
        isLoading, 
        registrarTransaccion, 
        crearCuenta, 
        marcarOrdenComoPagada,
        refresh 
    } = useFinanzas();
    
    const [activeTab, setActiveTab] = useState<TabType>('todo');

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    
    const [modalDefaultOrdenId, setModalDefaultOrdenId] = useState<string | undefined>();
    const [modalDefaultTipo, setModalDefaultTipo] = useState<string | undefined>();

    const openTransactionModal = (ordenId?: string, tipo: string = 'ingreso') => {
        setModalDefaultOrdenId(ordenId);
        setModalDefaultTipo(tipo);
        setIsTransactionModalOpen(true);
    };

    if (isLoading && cuentas.length === 0) {
        return <div className="p-12 text-center text-slate-400 animate-pulse">Cargando módulos financieros...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Global Minimalista */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finanzas</h1>
                    <p className="text-slate-500 mt-1 text-sm">Control de cajas, bancos, obligaciones y cartera de clientes.</p>
                </div>
                <button 
                    onClick={() => openTransactionModal()}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Movimiento
                </button>
            </div>

            {/* Pestañas (Tabs) Limpias */}
            <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex flex-wrap gap-1 w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('todo')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === 'todo' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <LayoutDashboard className="h-4 w-4" /> Resumen Global
                </button>
                <button 
                    onClick={() => setActiveTab('obligaciones')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === 'obligaciones' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <CalendarClock className="h-4 w-4" /> Obligaciones Fijas
                </button>
                <button 
                    onClick={() => setActiveTab('cobrar')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === 'cobrar' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <HandCoins className="h-4 w-4" /> Cuentas por Cobrar
                    {cuentasPorCobrar.length > 0 && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-bold">{cuentasPorCobrar.length}</span>
                    )}
                </button>
            </div>

            {/* CONTENEDOR DE PESTAÑAS */}

            {activeTab === 'todo' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <AccountsHeader 
                        cuentas={cuentas} 
                        onNewAccount={() => setIsAccountModalOpen(true)} 
                    />
                    <TransactionTable transacciones={transacciones} />
                </div>
            )}

            {activeTab === 'obligaciones' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <GastosManager 
                        cuentas={cuentas} 
                        onRecargarFinanzas={refresh} 
                    />
                    {/* Tabla de movimientos filtrada EXCLUSIVAMENTE para obligaciones fijas (tipo obligaciones) */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Historial de Pagos de Obligaciones</h3>
                        <TransactionTable 
                            transacciones={transacciones.filter(t => t.tipo === 'obligaciones')} 
                        />
                    </div>
                </div>
            )}

            {activeTab === 'cobrar' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <CuentasPorCobrar 
                        cuentas={cuentasPorCobrar}
                        onCobrar={(ordenId) => openTransactionModal(ordenId, 'ingreso')}
                        onMarcarPagado={marcarOrdenComoPagada}
                    />
                </div>
            )}

            <TransactionModal 
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                cuentas={cuentas}
                onSave={registrarTransaccion}
                defaultOrdenId={modalDefaultOrdenId}
                defaultTipo={modalDefaultTipo}
            />

            <CreateAccountModal 
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSave={crearCuenta}
            />
        </div>
    );
}