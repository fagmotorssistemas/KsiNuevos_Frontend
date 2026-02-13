import { Info, MapPin, ShieldCheck, Layers, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from "@/components/ui/Card";
import { ContratoDetalle } from "@/types/contratos.types";

interface InsuranceTableProps {
    data: ContratoDetalle[];
    activeFilter: 'rastreador' | 'seguro' | 'ambos';
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onManage: (id: string) => void;
}

export function InsuranceTable({ data, activeFilter, onManage }: InsuranceTableProps) {
    
    const getActionIcon = () => {
        switch (activeFilter) {
            case 'rastreador': return <MapPin size={18} />;
            case 'seguro': return <ShieldCheck size={18} />;
            default: return <Layers size={18} />;
        }
    };

    const getActionTitle = () => {
        switch (activeFilter) {
            case 'rastreador': return "Gestionar Rastreo";
            case 'seguro': return "Gestionar Seguros";
            default: return "Gestión Integral";
        }
    };

    const parseCurrency = (val: string | number | undefined) => 
        parseFloat(val?.toString().replace(/[^0-9.]/g, '') || "0");

    return (
        <Card className="border-slate-100 overflow-hidden shadow-sm bg-white rounded-2xl">
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
                            <th className="px-8 py-5 text-center">Tiempo Instalación</th>
                            <th className="px-8 py-5 text-center w-32">Gestión</th> 
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

                                {/* Columna de Tiempo con Alerta Visual */}
                                <td className="px-8 py-5 text-center">
                                    <div className="flex justify-center">
                                        <InstallationCounter date={det.fechaCiudad || det.textoFecha} />
                                    </div>
                                </td>
                                
                                <td className="px-8 py-5 text-center">
                                    <button 
                                        onClick={() => onManage(det.ccoCodigo)}
                                        title={getActionTitle()}
                                        className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white bg-[#E11D48] hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 group-hover:rotate-3"
                                    >
                                        {getActionIcon()}
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

// --- SUB-COMPONENTE: CONTADOR DE DÍAS CON ALERTA DE 30 DÍAS ---
function InstallationCounter({ date }: { date?: string | null }) {
    
    // Función auxiliar para calcular estado y si debe mostrar el punto rojo
    const calculateStatus = () => {
        if (!date) return { 
            text: "Pendiente", 
            color: "bg-slate-100 text-slate-400", 
            icon: AlertCircle,
            showWarning: false
        };

        // 1. Extraer fecha
        const cleanDate = date.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/);
        
        if (!cleanDate) return { 
            text: "Sin Fecha", 
            color: "bg-slate-50 text-slate-300", 
            icon: AlertCircle,
            showWarning: false
        };

        const datePart = cleanDate[0];
        let targetDate: Date;

        // 2. Parseo seguro (Local Time)
        if (datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            const [year, month, day] = datePart.split('-');
            targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // 3. Lógica del PUNTITO ROJO (Entre 23 y 30 días)
        const showWarning = diffDays >= 23 && diffDays <= 30;

        if (diffDays === 0) return { 
            text: "Instalado hoy", 
            color: "bg-emerald-100 text-emerald-700", 
            icon: CheckCircle2,
            showWarning
        };
        if (diffDays === 1) return { 
            text: "Hace 1 día", 
            color: "bg-blue-50 text-blue-600", 
            icon: Clock,
            showWarning
        };
        if (diffDays > 0) return { 
            text: `Hace ${diffDays} días`, 
            color: "bg-slate-100 text-slate-600", 
            icon: Clock,
            showWarning
        };
        
        return { 
            text: "Fecha Futura", 
            color: "bg-amber-50 text-amber-600", 
            icon: AlertCircle,
            showWarning
        };
    };

    const status = calculateStatus();
    const Icon = status.icon;

    return (
        <div className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent ${status.color} transition-colors`}>
            <Icon size={12} strokeWidth={2.5} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                {status.text}
            </span>
            
            {/* PUNTITO ROJO DE ALERTA (Solo entre días 23-30) */}
            {status.showWarning && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                </span>
            )}
        </div>
    );
}
