import React from "react";
import { FileText, Download, UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface ArchivosTabProps {
    orden: OrdenTrabajo;
    isUploading: boolean;
    onTriggerUpload: (bucket: any) => void;
}

export function ArchivosTab({ orden, isUploading, onTriggerUpload }: ArchivosTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Proforma PDF */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-red-100 p-3 rounded-xl text-red-600">
                        <FileText className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">Proforma PDF Generada</h3>
                        <p className="text-sm text-slate-500">Documento base del inicio del trabajo.</p>
                    </div>
                </div>
                {orden.pdf_url ? (
                    <a href={orden.pdf_url} target="_blank" rel="noreferrer" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                        <Download className="h-4 w-4" /> Descargar Archivo
                    </a>
                ) : (
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-400 border border-slate-200 border-dashed px-4 py-2 rounded-lg">Sin proforma</p>
                        <button onClick={() => onTriggerUpload('ordenes-trabajo')} disabled={isUploading} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg disabled:opacity-50">
                            <UploadCloud className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Evidencias Fotográficas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-blue-600" /> Evidencias del Trabajo
                    </h3>
                    <button 
                        onClick={() => onTriggerUpload('taller-evidencias')} 
                        disabled={isUploading}
                        className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        Subir Foto
                    </button>
                </div>

                {!orden.fotos_ingreso_urls?.length ? (
                    <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-xl">
                        <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium text-sm">No hay fotos de evidencia guardadas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {orden.fotos_ingreso_urls.map((url, idx) => (
                            <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group relative">
                                <img src={url} alt={`Evidencia ${idx}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a href={url} target="_blank" rel="noreferrer" className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">Ver Grande</a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}