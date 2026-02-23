import { useState } from "react";
import { User, Phone, Car, DollarSign, History, Receipt, CheckCircle2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { CuentaPorCobrar } from "@/types/taller";

interface Props {
    cuentas: CuentaPorCobrar[];
    onCobrar: (ordenId: string) => void;
    onMarcarPagado: (ordenId: string) => void;
}

export function CuentasPorCobrar({ cuentas, onCobrar, onMarcarPagado }: Props) {
    // Calculamos el total global adeudado
    const totalDeuda = cuentas.reduce((acc, c) => acc + c.saldo_pendiente, 0);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (cuentas.length === 0) {
        return (
            <div className="text-center py-16 px-4 border border-slate-200 rounded-2xl bg-white">
                <div className="bg-slate-50 p-4 rounded-full inline-block mb-4">
                    <CheckCircle2 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700">Cartera al día</h3>
                <p className="text-slate-500 text-sm mt-1">No hay cuentas por cobrar pendientes en el sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Tarjeta de Resumen Global Minimalista */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl">
                        <Receipt className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="text-slate-800 font-bold text-lg">Total Pendiente por Cobrar</h3>
                        <p className="text-slate-500 text-sm">Suma de saldos pendientes sobre presupuestos</p>
                    </div>
                </div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">
                    ${totalDeuda.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Grid de Deudores */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
                {cuentas.map(c => {
                    const coberturaCompleta = c.total_pagado >= c.presupuesto && c.presupuesto > 0;

                    return (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base">
                                        {c.vehiculo_marca} {c.vehiculo_modelo} <span className="text-slate-400 font-medium">({c.vehiculo_placa})</span>
                                    </h4>
                                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <User className="h-3.5 w-3.5 text-slate-400" /> {c.cliente?.nombre_completo || 'Cliente General'}
                                        </p>
                                        {c.cliente?.telefono && (
                                            <p className="flex items-center gap-1.5 font-mono text-slate-500">
                                                <Phone className="h-3 w-3 text-slate-400" /> {c.cliente.telefono}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    {c.estado_contable}
                                </span>
                            </div>

                            {/* Balance de la Orden */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-xl mb-5 text-center border border-slate-100">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Presupuesto</p>
                                    <p className="font-bold text-slate-800">${c.presupuesto.toLocaleString()}</p>
                                </div>
                                <div className="border-x border-slate-200">
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Pagado</p>
                                    <p className="font-bold text-slate-800">${c.total_pagado.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">Gastado</p>
                                    <p className="font-medium text-slate-600">${c.total_gastado.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${expandedId === c.id ? 'bg-slate-200 text-slate-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                                    >
                                        <History className="h-4 w-4" /> Historial
                                    </button>
                                    <button 
                                        onClick={() => onCobrar(c.id)}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                                    >
                                        <DollarSign className="h-4 w-4" /> Cobrar
                                    </button>
                                </div>

                                {/* Botón Inteligente si ya cubrió el presupuesto */}
                                {coberturaCompleta && (
                                    <button 
                                        onClick={() => onMarcarPagado(c.id)}
                                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mt-1"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Marcar orden como Pagada
                                    </button>
                                )}
                            </div>

                            {/* Historial Desplegable */}
                            {expandedId === c.id && (
                                <div className="mt-5 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 duration-200">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Movimientos de la Orden</h5>
                                    {c.transacciones && c.transacciones.length > 0 ? (
                                        <div className="space-y-2">
                                            {/* Ahora mapeamos TODOS los movimientos, no solo ingresos */}
                                            {c.transacciones.map((t, i) => {
                                                const esIngreso = t.tipo === 'ingreso';
                                                
                                                return (
                                                    <div key={i} className={`flex justify-between items-center text-sm p-3 rounded-lg border ${esIngreso ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                                                        <div>
                                                            <p className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                                                                {esIngreso ? (
                                                                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                                                                )}
                                                                {t.descripcion}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 mt-1 ml-5">
                                                                {new Date(t.fecha_transaccion).toLocaleDateString()} • {t.tipo.replace(/_/g, ' ')}
                                                            </p>
                                                        </div>
                                                        <span className={`font-bold px-2 py-1 rounded bg-white border ${esIngreso ? 'text-emerald-700 border-emerald-200' : 'text-red-700 border-red-200'}`}>
                                                            {esIngreso ? '+' : '-'}${t.monto.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-sm text-slate-400">No se han registrado movimientos.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}