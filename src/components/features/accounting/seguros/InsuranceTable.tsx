import { Info, Eye } from 'lucide-react';
import { Card } from "@/components/ui/Card";
import { ContratoDetalle } from "@/types/contratos.types";

interface InsuranceTableProps {
    data: ContratoDetalle[];
    activeFilter: 'rastreador' | 'seguro' | 'ambos';
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetail: (id: string) => void;
}

export function InsuranceTable({ data, activeFilter, onViewDetail }: InsuranceTableProps) {
    return (
        <Card className="border-slate-200 overflow-hidden shadow-sm bg-white">
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-md">
                    <Info size={14} className="text-slate-600" />
                    Mostrando {data.length} registros
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    {/* Se cambió border-b por border-b border-slate-100 para igualar el tono */}
                    <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Nombre del Cliente</th>
                            <th className="px-6 py-4 text-right">Importe Total</th>
                            <th className="px-6 py-4 text-center w-20">Ver</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((det) => (
                            <tr key={det.notaVenta} className="group hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="uppercase text-slate-900 font-bold">{det.facturaNombre}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {det.notaVenta}</p>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                                    {(() => {
                                        const vR = parseFloat(det.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0");
                                        const vS = parseFloat(det.totalSeguro?.toString().replace(/[^0-9.]/g, '') || "0");
                                        const t = activeFilter === 'rastreador' ? vR : activeFilter === 'seguro' ? vS : (vR + vS);
                                        return `$${t.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                    })()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => onViewDetail(det.ccoCodigo)}
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}