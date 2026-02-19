import React, { useState } from "react";
import { ArrowLeft, Folder } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";
import { ResumenTab } from "./tabs/ResumenTab";
import { FinanzasTab } from "./tabs/FinanzasTab";
import { ArchivosTab } from "./tabs/ArchivosTab";

interface DetailProps {
    orden: OrdenTrabajo;
    onClose: () => void;
    isUploading: boolean;
    onTriggerUpload: (bucket: any, transaccionId?: string) => void;
}

export function ExpedienteDetail({ orden, onClose, isUploading, onTriggerUpload }: DetailProps) {
    const [activeTab, setActiveTab] = useState<'resumen' | 'finanzas' | 'archivos'>('resumen');

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header del Expediente */}
            <div className="border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div>
                    <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 font-medium transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Volver a Carpetas
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 rounded-lg">
                            <Folder className="h-6 w-6 text-slate-600" fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                                {orden.vehiculo_marca} {orden.vehiculo_modelo} <span className="text-slate-400 font-normal">({orden.vehiculo_placa})</span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Expediente #{orden.numero_orden}</p>
                        </div>
                    </div>
                </div>
                
                {/* Selector de Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('resumen')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'resumen' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Resumen</button>
                    <button onClick={() => setActiveTab('finanzas')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'finanzas' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Finanzas</button>
                    <button onClick={() => setActiveTab('archivos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'archivos' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Documentos</button>
                </div>
            </div>

            {/* Contenedor del contenido */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'resumen' && <ResumenTab orden={orden} />}
                    
                    {activeTab === 'finanzas' && (
                        <FinanzasTab orden={orden} isUploading={isUploading} onTriggerUpload={onTriggerUpload} />
                    )}
                    
                    {activeTab === 'archivos' && (
                        <ArchivosTab orden={orden} isUploading={isUploading} onTriggerUpload={onTriggerUpload} />
                    )}
                </div>
            </div>
        </div>
    );
}