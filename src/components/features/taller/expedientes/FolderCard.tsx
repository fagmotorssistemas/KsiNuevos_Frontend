import React from "react";
import { Folder, FileText } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface FolderCardProps {
    orden: OrdenTrabajo;
    onClick: () => void;
}

// Función utilitaria: Convertimos el estado a minúsculas para evitar errores de TypeScript
const getStatusConfig = (estadoOriginal: string) => {
    // Normalizamos el texto (ej: de 'COMPLETADO' o 'Completado' pasará a 'completado')
    const estado = (estadoOriginal as string).toLowerCase();

    // NOTA: Si tus estados se llaman diferente (ej: 'finalizado', 'entregado'), 
    // cambia las palabras aquí abajo para que coincidan con tu sistema.
    switch (estado) {
        case 'completado': 
        case 'completada':
        case 'finalizado':
            return { color: 'text-green-700', bg: 'bg-green-100' };
        case 'en_proceso': 
        case 'en proceso':
            return { color: 'text-blue-700', bg: 'bg-blue-100' };
        case 'cancelado': 
        case 'cancelada':
            return { color: 'text-red-700', bg: 'bg-red-100' };
        default: 
            return { color: 'text-amber-700', bg: 'bg-amber-100' };
    }
};

export function FolderCard({ orden, onClick }: FolderCardProps) {
    const docCount = (orden.pdf_url ? 1 : 0) + 
                     (orden.fotos_ingreso_urls?.length || 0) + 
                     (orden.transacciones?.filter(t => t.comprobante_url).length || 0);

    // Formateamos el texto del estado para mostrarlo limpio en la tarjeta
    const estadoFormateado = (orden.estado as string).replace(/_/g, ' ');
    const status = getStatusConfig(orden.estado as string);
    
    // Solución al error de TypeScript: forzamos a string y normalizamos
    const estadoNormalizado = (orden.estado as string).toLowerCase();
    
    // Comprobamos si el estado incluye la palabra "completado", "completada" o "finalizado"
    const isCompleted = estadoNormalizado === 'completado' || 
                        estadoNormalizado === 'completada' || 
                        estadoNormalizado === 'finalizado';
                        
    const folderBg = isCompleted ? 'bg-emerald-50' : 'bg-blue-50';
    const tabBg = isCompleted ? 'bg-emerald-100' : 'bg-blue-100';
    const hoverBg = isCompleted ? 'group-hover:bg-emerald-100' : 'group-hover:bg-blue-100';

    return (
        <div onClick={onClick} className="group cursor-pointer flex flex-col w-full transition-all hover:-translate-y-1 mt-2">
            {/* Pestaña superior suavizada */}
            <div className={`w-1/3 h-4 ${tabBg} rounded-t-lg ml-3 relative z-10 transition-colors border border-b-0 border-slate-200/60`}></div>
            
            {/* Cuerpo de la carpeta */}
            <div className={`w-full ${folderBg} ${hoverBg} rounded-2xl rounded-tl-none p-5 shadow-sm border border-slate-200/60 relative flex flex-col transition-colors min-h-[140px]`}>
                
                {/* Encabezado: Número de orden y Estado */}
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-base truncate">#{orden.numero_orden}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                        {estadoFormateado}
                    </span>
                </div>
                
                {/* Nombre del cliente */}
                <p className="text-sm text-slate-600 truncate mb-4">
                    {orden.cliente?.nombre_completo || 'Sin cliente registrado'}
                </p>
                
                {/* Pie de la tarjeta: Icono de carpeta y contador de archivos */}
                <div className="mt-auto flex justify-between items-center text-slate-500">
                    <Folder className="h-5 w-5 opacity-50" fill="currentColor" />
                    <p className="text-xs font-medium flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg">
                        <FileText className="h-3.5 w-3.5 text-slate-400" /> {docCount} archivos
                    </p>
                </div>
            </div>
        </div>
    );
}