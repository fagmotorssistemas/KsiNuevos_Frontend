// src/components/rastreadores/dashboard/RastreoStats.tsx
import { MapPin } from "lucide-react";

interface RastreoStatsProps {
    totalDispositivos: number;
    totalRecaudado: number;
}

export function RastreoStats({ totalDispositivos, totalRecaudado }: RastreoStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dispositivos</p>
                    <p className="text-4xl font-black text-slate-800 mt-2">{totalDispositivos}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-full text-blue-600"><MapPin size={32} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Ventas</p>
                    <p className="text-4xl font-black text-blue-600 mt-2">${totalRecaudado.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-full text-blue-600"><span className="text-2xl font-black">$</span></div>
            </div>
        </div>
    );
}