import React from "react";
import { Folder } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface FolderCardProps {
    orden: OrdenTrabajo;
    onClick: () => void;
}

const getStatusConfig = (estadoOriginal: string) => {
    const estado = (estadoOriginal as string).toLowerCase();
    switch (estado) {
        case 'entregado':
            return { color: 'text-green-700', bg: 'bg-green-100' };
        case 'terminado':
            return { color: 'text-blue-700', bg: 'bg-blue-100' };
        case 'en_proceso':
        case 'en proceso':
            return { color: 'text-slate-700', bg: 'bg-slate-100' };
        case 'cancelado':
        case 'cancelada':
            return { color: 'text-red-700', bg: 'bg-red-100' };
        default:
            return { color: 'text-amber-700', bg: 'bg-amber-100' };
    }
};

export function FolderCard({ orden, onClick }: FolderCardProps) {
    const estadoFormateado = (orden.estado as string).replace(/_/g, ' ');
    const status = getStatusConfig(orden.estado as string);

    const clienteNombre = orden.cliente?.nombre_completo || 'Sin cliente';
    const vehiculoTexto = [orden.vehiculo_marca, orden.vehiculo_modelo].filter(Boolean).join(' ') || 'Sin vehículo';

    return (
        <div onClick={onClick} className="group cursor-pointer flex flex-col w-full transition-all hover:-translate-y-0.5 mt-2">
            <div className="w-1/3 h-3 bg-slate-200 rounded-t-md ml-3 relative z-10 border border-b-0 border-slate-200" />
            <div className="w-full bg-white group-hover:bg-slate-50 rounded-xl rounded-tl-none p-4 shadow-sm border border-slate-200 relative flex flex-col transition-colors min-h-[120px]">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 text-sm truncate">#{orden.numero_orden}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide shrink-0 ${status.bg} ${status.color}`}>
                        {estadoFormateado}
                    </span>
                </div>
                <p className="text-base font-bold text-slate-800 truncate leading-tight">
                    {vehiculoTexto}
                </p>
                <p className="text-xs text-slate-500 truncate mt-1">
                    {clienteNombre}
                </p>
                <div className="mt-auto pt-3 flex items-center justify-between">
                    <Folder className="h-4 w-4 opacity-60 text-slate-400" fill="currentColor" />
                    {orden.vehiculo_placa && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-200 text-slate-700">
                            {orden.vehiculo_placa}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}