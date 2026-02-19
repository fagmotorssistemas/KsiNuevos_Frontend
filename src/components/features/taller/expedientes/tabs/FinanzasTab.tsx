import React, { useMemo } from "react";
import { DollarSign, UploadCloud, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface FinanzasTabProps {
    orden: OrdenTrabajo;
    isUploading: boolean;
    onTriggerUpload: (bucket: any, id?: string) => void;
}

function StatCard({ title, amount, type }: { title: string, amount: number, type: 'ingreso' | 'gasto' | 'neutral' }) {
    const isIngreso = type === 'ingreso';
    const isGasto = type === 'gasto';
    
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                <p className={`text-2xl font-black ${isIngreso ? 'text-emerald-600' : isGasto ? 'text-rose-600' : 'text-slate-800'}`}>
                    ${amount.toFixed(2)}
                </p>
            </div>
            <div className={`p-3 rounded-full ${isIngreso ? 'bg-emerald-100 text-emerald-600' : isGasto ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                {isIngreso ? <ArrowUpRight className="h-6 w-6" /> : isGasto ? <ArrowDownRight className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
            </div>
        </div>
    );
}

export function FinanzasTab({ orden, isUploading, onTriggerUpload }: FinanzasTabProps) {
    const finanzas = useMemo(() => {
        if (!orden.transacciones) return { ingresos: 0, gastos: 0, balance: 0 };
        const ingresos = orden.transacciones.filter(t => t.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
        const gastos = orden.transacciones.filter(t => t.tipo !== 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
        return { ingresos, gastos, balance: ingresos - gastos };
    }, [orden]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Pagos (Cliente)" amount={finanzas.ingresos} type="ingreso" />
                <StatCard title="Gastos Asociados" amount={finanzas.gastos} type="gasto" />
                <StatCard title="Balance Orden" amount={finanzas.balance} type="neutral" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-black text-slate-800">Detalle de Movimientos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                                <th className="px-6 py-4 text-center">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!orden.transacciones?.length ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                            ) : (
                                orden.transacciones.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{new Date(t.fecha_transaccion).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{t.descripcion}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${t.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {t.tipo.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {t.comprobante_url ? (
                                                <a href={t.comprobante_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                                    <FileText className="h-3 w-3" /> Ver Adjunto
                                                </a>
                                            ) : (
                                                <button 
                                                    onClick={() => onTriggerUpload('taller-comprobantes', t.id)} 
                                                    disabled={isUploading}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <UploadCloud className="h-3 w-3" /> Subir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}