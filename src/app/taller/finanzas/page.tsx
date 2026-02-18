"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinanzas } from "@/hooks/taller/useFinanzas";
import { AccountsHeader } from "@/components/features/taller/finanzas/AccountsHeader";
import { TransactionTable } from "@/components/features/taller/finanzas/TransactionTable";
import { TransactionModal } from "@/components/features/taller/finanzas/TransactionModal";
import { CreateAccountModal } from "@/components/features/taller/finanzas/CreateAccountModal";
// Importar el nuevo gestor
import { GastosManager } from "@/components/features/taller/finanzas/GastosManager";

export default function FinanzasPage() {
    const { cuentas, transacciones, isLoading, registrarTransaccion, crearCuenta, refresh } = useFinanzas();
    
    // Estados para los modales existentes
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    if (isLoading && cuentas.length === 0) {
        return <div className="p-12 text-center text-slate-400">Cargando datos financieros...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Finanzas y Tesorería</h1>
                    <p className="text-slate-500">Control de cajas, bancos y gastos recurrentes.</p>
                </div>
                <button 
                    onClick={() => setIsTransactionModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Movimiento
                </button>
            </div>

            {/* Saldos de Cuentas */}
            <AccountsHeader 
                cuentas={cuentas} 
                onNewAccount={() => setIsAccountModalOpen(true)} 
            />

            {/* NUEVO: Gestor de Gastos Básicos */}
            <GastosManager 
                cuentas={cuentas} 
                onRecargarFinanzas={refresh} // Pasamos refresh para actualizar saldos si se paga algo
            />

            {/* Historial de Transacciones */}
            <TransactionTable transacciones={transacciones} />

            {/* Modales Existentes */}
            <TransactionModal 
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                cuentas={cuentas}
                onSave={registrarTransaccion}
            />

            <CreateAccountModal 
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSave={crearCuenta}
            />
        </div>
    );
}