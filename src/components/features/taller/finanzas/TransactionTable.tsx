import { ArrowDownLeft, ArrowUpRight, FileText, Car } from "lucide-react";
import type { Transaccion } from "@/hooks/taller/useFinanzas";

interface TransactionTableProps {
    transacciones: Transaccion[];
}

export function TransactionTable({ transacciones }: TransactionTableProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Movimientos Recientes</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Tipo / Fecha</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Cuenta</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-center">Evidencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transacciones.length > 0 ? (
                            transacciones.map((tx) => {
                                const esIngreso = tx.tipo === 'ingreso';
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${esIngreso ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {esIngreso ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 capitalize">{tx.tipo.replace('_', ' ')}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(tx.fecha_transaccion).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-800 font-medium">{tx.descripcion}</p>
                                            {tx.orden && (
                                                <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5 bg-blue-50 w-fit px-1.5 py-0.5 rounded">
                                                    <Car className="h-3 w-3" />
                                                    Orden #{tx.orden.numero_orden} ({tx.orden.vehiculo_placa})
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {tx.cuenta?.nombre_cuenta}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold ${esIngreso ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {esIngreso ? '+' : '-'}${tx.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {tx.comprobante_url ? (
                                                <a 
                                                    href={tx.comprobante_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Ver Comprobante"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No hay movimientos registrados aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}