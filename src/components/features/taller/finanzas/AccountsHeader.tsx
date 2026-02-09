import { Wallet, CreditCard, Building, Plus } from "lucide-react";
import type { Cuenta } from "@/types/taller"; // <--- Importación corregida (antes venía de useFinanzas)

interface AccountsHeaderProps {
    cuentas: Cuenta[];
    onNewAccount?: () => void; // Por si quisieras crear cuentas desde el UI
}

export function AccountsHeader({ cuentas }: AccountsHeaderProps) {
    // Calculamos total global
    const totalGlobal = cuentas.reduce((acc, c) => acc + c.saldo_actual, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {/* Tarjeta de Resumen Total */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full blur-2xl opacity-20"></div>
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Capital Total</p>
                    <h3 className="text-3xl font-black">${totalGlobal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-300">
                    <Building className="h-4 w-4" />
                    <span>Consolidado todas las cuentas</span>
                </div>
            </div>

            {/* Listado de Cuentas Individuales */}
            {cuentas.map((cuenta) => (
                <div key={cuenta.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${cuenta.es_caja_chica ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {cuenta.es_caja_chica ? <Wallet className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                        </div>
                        {cuenta.saldo_actual < 0 && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">Sobregiro</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-1">{cuenta.nombre_cuenta}</h4>
                        <p className={`text-2xl font-bold ${cuenta.saldo_actual < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            ${cuenta.saldo_actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        {cuenta.numero_cuenta && (
                            <p className="text-xs text-slate-400 mt-1 font-mono">**** {cuenta.numero_cuenta.slice(-4)}</p>
                        )}
                    </div>
                </div>
            ))}
            
            {/* Botón Ghost para añadir (Visual) */}
            {cuentas.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6">
                    <p className="text-sm font-medium">No hay cuentas configuradas</p>
                </div>
            )}
        </div>
    );
}