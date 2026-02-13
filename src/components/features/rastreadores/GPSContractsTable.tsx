import { Info, MapPin, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
// Asegúrate de que este archivo exista en la ruta correcta
import { ContratoGPS } from "@/types/rastreadores.types";

interface GPSContractsTableProps {
    data: ContratoGPS[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onManage: (id: string) => void;
}

export function GPSContractsTable({ data, onManage }: GPSContractsTableProps) {
    return (
        <div className="border border-slate-100 overflow-hidden shadow-sm bg-white rounded-2xl">
            <div className="p-5 border-b border-slate-50 bg-white flex justify-between items-center">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100">
                    <Info size={14} className="text-slate-900" />
                    Mostrando {data.length} registros | Rastreadores
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-white text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-50">
                        <tr>
                            <th className="px-8 py-5">Nombre del Cliente</th>
                            <th className="px-8 py-5 text-right">Valor GPS</th>
                            <th className="px-8 py-5 text-center">Tiempo Instalación</th>
                            <th className="px-8 py-5 text-center w-32">Gestión</th> 
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((det) => (
                            <tr key={det.ccoCodigo} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-5">
                                    <p className="uppercase text-slate-900 font-bold tracking-tight">{det.cliente}</p>
                                    <p className="text-[9px] text-slate-300 font-mono mt-1">{det.notaVenta}</p>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className="font-mono font-black text-slate-900 text-base">
                                        ${det.totalRastreador.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="flex justify-center">
                                        <InstallationCounter date={det.fechaInstalacion} />
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <button 
                                        onClick={() => onManage(det.ccoCodigo)}
                                        title="Gestionar GPS"
                                        className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white bg-[#E11D48] hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95 group-hover:rotate-3"
                                    >
                                        <MapPin size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function InstallationCounter({ date }: { date?: string | null }) {
    const getStatus = () => {
        if (!date) return { text: "Pendiente", color: "bg-slate-100 text-slate-400", icon: AlertCircle, warn: false };
        
        // Limpieza básica de fecha
        const cleanDate = date.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/);
        if (!cleanDate) return { text: "Sin Fecha", color: "bg-slate-50 text-slate-300", icon: AlertCircle, warn: false };

        const part = cleanDate[0];
        let target: Date;
        // Parseo simple DD/MM/YYYY o YYYY-MM-DD
        if (part.includes('/')) {
            const [d, m, y] = part.split('/');
            target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
            const [y, m, d] = part.split('-');
            target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }

        const today = new Date(); today.setHours(0,0,0,0); target.setHours(0,0,0,0);
        const diffMs = today.getTime() - target.getTime();
        const days = Math.round(diffMs / 86400000);
        
        // Alerta entre 23 y 30 días
        const warn = days >= 23 && days <= 30;

        if (days === 0) return { text: "Instalado hoy", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, warn };
        if (days > 0) return { text: `Hace ${days} días`, color: "bg-slate-100 text-slate-600", icon: Clock, warn };
        return { text: "Futuro", color: "bg-amber-50 text-amber-600", icon: AlertCircle, warn };
    };

    const s = getStatus();
    const Icon = s.icon;

    return (
        <div className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent ${s.color}`}>
            <Icon size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">{s.text}</span>
            {s.warn && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span></span>}
        </div>
    );
}