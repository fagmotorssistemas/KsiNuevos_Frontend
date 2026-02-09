import { Info, Eye, MapPin, ShieldCheck, Layers } from 'lucide-react';
import { Card } from "@/components/ui/Card";
import { ContratoDetalle } from "@/types/contratos.types";

interface InsuranceTableProps {
    data: ContratoDetalle[];
    activeFilter: 'rastreador' | 'seguro' | 'ambos';
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetail: (id: string) => void; 
    onAudit: (id: string) => void;      
}

export function InsuranceTable({ data, activeFilter, onViewDetail, onAudit }: InsuranceTableProps) {
    
    const getAuditIcon = () => {
        switch (activeFilter) {
            case 'rastreador': return <MapPin size={18} />;
            case 'seguro': return <ShieldCheck size={18} />;
            default: return <Layers size={18} />;
        }
    };

    const getAuditTitle = () => {
        switch (activeFilter) {
            case 'rastreador': return "Abrir Formulario de Rastreo";
            case 'seguro': return "Abrir Formulario de Seguros";
            default: return "Abrir Gestión Integral";
        }
    };

    const parseCurrency = (val: string | number | undefined) => 
        parseFloat(val?.toString().replace(/[^0-9.]/g, '') || "0");

    return (
        <Card className="border-slate-100 overflow-hidden shadow-sm bg-white rounded-2xl">
            {/* Header: Limpio, sin azules */}
            <div className="p-5 border-b border-slate-50 bg-white flex flex-col sm:row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100">
                    <Info size={14} className="text-slate-900" />
                    Mostrando {data.length} registros <span className="text-slate-900 ml-1">| {activeFilter}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-white text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-50">
                        <tr>
                            <th className="px-8 py-5">Nombre del Cliente</th>
                            <th className="px-8 py-5 text-right">Importe Total</th>
                            <th className="px-8 py-5 text-center w-32">Acción Técnica</th> 
                            <th className="px-8 py-5 text-center w-24">Expediente</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((det) => (
                            <tr key={det.notaVenta} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-5">
                                    <p className="uppercase text-slate-900 font-bold tracking-tight">{det.facturaNombre}</p>
                                    <p className="text-[9px] text-slate-300 font-mono mt-1">{det.notaVenta}</p>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className="font-mono font-black text-slate-900 text-base">
                                        {(() => {
                                            const vR = parseCurrency(det.totalRastreador);
                                            const vS = parseCurrency(det.totalSeguro);
                                            const t = activeFilter === 'rastreador' ? vR : activeFilter === 'seguro' ? vS : (vR + vS);
                                            return `$${t.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        })()}
                                    </span>
                                </td>
                                
                                {/* COLUMNA 1: AUDITORÍA (Acento Rojo de Marca) */}
                                <td className="px-8 py-5 text-center">
                                    <button 
                                        onClick={() => onAudit(det.ccoCodigo)}
                                        title={getAuditTitle()}
                                        className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white bg-[#E11D48] hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 group-hover:rotate-3"
                                    >
                                        {getAuditIcon()}
                                    </button>
                                </td>

                                {/* COLUMNA 2: EXPEDIENTE (Minimalista) */}
                                <td className="px-8 py-5 text-center">
                                    <button 
                                        onClick={() => onViewDetail(det.ccoCodigo)}
                                        title="Ver Información Completa"
                                        className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-slate-300 hover:text-slate-900 hover:bg-white hover:border-slate-200 border border-transparent transition-all active:scale-95"
                                    >
                                        <Eye size={20} />
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