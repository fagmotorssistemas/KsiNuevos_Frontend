import { Calendar, User, ArrowRight, AlertCircle } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller"; // <--- Corregido

interface JobCardProps {
    orden: OrdenTrabajo;
    onClick: (orden: OrdenTrabajo) => void;
}

export function JobCard({ orden, onClick }: JobCardProps) {
    const diasEnTaller = Math.floor((new Date().getTime() - new Date(orden.fecha_ingreso).getTime()) / (1000 * 3600 * 24));
    const esCritico = diasEnTaller > 15;

    return (
        <div 
            onClick={() => onClick(orden)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
        >
            {esCritico && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" title="Retrasado"></div>
            )}

            <div className="flex justify-between items-start mb-2 pl-2">
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {orden.vehiculo_placa}
                </span>
                <span className="text-xs font-bold text-blue-600">#{orden.numero_orden}</span>
            </div>

            <h4 className="font-bold text-slate-800 text-sm mb-1 truncate pl-2">
                {orden.vehiculo_marca} {orden.vehiculo_modelo}
            </h4>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 pl-2">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{orden.cliente?.nombre_completo}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-2 pl-2">
                <div className={`flex items-center gap-1 text-xs font-medium ${esCritico ? 'text-red-500' : 'text-slate-400'}`}>
                    {esCritico ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    <span>{diasEnTaller} días</span>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                </div>
            </div>
        </div>
    );
}