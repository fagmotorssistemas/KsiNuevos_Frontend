"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinanzas } from "@/hooks/taller/useFinanzas";
import { CuentasPorCobrar } from "@/components/features/taller/finanzas/CuentasPorCobrar";
import { TransactionModal } from "@/components/features/taller/finanzas/TransactionModal";

export default function CuentasPorCobrarPage() {
    const {
        cuentas,
        cuentasPorCobrar,
        isLoading,
        registrarTransaccion,
        marcarOrdenComoPagada,
    } = useFinanzas();

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [modalDefaultOrdenId, setModalDefaultOrdenId] = useState<string | undefined>();
    const [modalDefaultTipo, setModalDefaultTipo] = useState<string>("ingreso");

    const openTransactionModal = (ordenId?: string, tipo: string = "ingreso") => {
        setModalDefaultOrdenId(ordenId);
        setModalDefaultTipo(tipo);
        setIsTransactionModalOpen(true);
    };

    if (isLoading && cuentasPorCobrar.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 animate-pulse">
                Cargando cuentas por cobrar...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cuentas por Cobrar</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Cartera de clientes y órdenes con saldo pendiente. Registre cobros y marque como pagado.
                    </p>
                </div>
                <button
                    onClick={() => openTransactionModal()}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Movimiento
                </button>
            </div>

            <CuentasPorCobrar
                cuentas={cuentasPorCobrar}
                onCobrar={(ordenId) => openTransactionModal(ordenId, "ingreso")}
                onMarcarPagado={marcarOrdenComoPagada}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                cuentas={cuentas}
                onSave={registrarTransaccion}
                defaultOrdenId={modalDefaultOrdenId}
                defaultTipo={modalDefaultTipo}
            />
        </div>
    );
}
