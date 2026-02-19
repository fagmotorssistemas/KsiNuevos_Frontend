import React from "react";
import { Folder, File } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface FolderCardProps {
    orden: OrdenTrabajo;
    onClick: () => void;
}

export function FolderCard({ orden, onClick }: FolderCardProps) {
    const docCount = (orden.pdf_url ? 1 : 0) + 
                     (orden.fotos_ingreso_urls?.length || 0) + 
                     (orden.transacciones?.filter(t => t.comprobante_url).length || 0);

    return (
        <div onClick={onClick} className="group cursor-pointer flex flex-col w-full transition-transform hover:-translate-y-1">
            {/* Pestaña superior de la carpeta */}
            <div className="w-1/2 h-5 bg-slate-500 rounded-t-xl ml-2 relative z-10 transition-colors group-hover:bg-slate-600"></div>
            
            {/* Cuerpo de la carpeta */}
            <div className="w-full bg-slate-600 rounded-xl rounded-tl-none p-4 shadow-md relative flex flex-col h-36 transition-colors group-hover:bg-slate-700">
                {/* Papeles asomando (efecto visual) */}
                <div className="absolute top-0 left-2 right-4 bottom-8 bg-white/90 rounded border border-slate-200 shadow-sm z-0 transform -translate-y-2 group-hover:-translate-y-4 transition-transform duration-300"></div>
                <div className="absolute top-0 left-4 right-2 bottom-8 bg-slate-50 rounded border border-slate-200 shadow-sm z-0 transform -translate-y-1 group-hover:-translate-y-2 transition-transform duration-300"></div>
                
                {/* Contenido frontal */}
                <div className="relative z-10 flex flex-col h-full justify-end text-white mt-4">
                    <div className="flex justify-between items-start mb-1">
                        <Folder className="h-6 w-6 text-slate-300" fill="currentColor" />
                        <span className="bg-slate-800/50 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                            {orden.estado.replace('_', ' ')}
                        </span>
                    </div>
                    <h3 className="font-bold text-sm truncate">Expediente #{orden.numero_orden}</h3>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-300 truncate w-2/3">{orden.cliente?.nombre_completo}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <File className="h-3 w-3" /> {docCount}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}