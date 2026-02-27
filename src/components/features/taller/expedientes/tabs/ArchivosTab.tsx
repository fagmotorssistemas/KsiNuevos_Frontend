import React from "react";
import { FileText, Eye, UploadCloud, Image as ImageIcon, Loader2, Receipt } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface ArchivosTabProps {
    orden: OrdenTrabajo;
    isUploading: boolean;
    onTriggerUpload: (bucket: any) => void;
    onPrint: () => void;
}

export function ArchivosTab({ orden, isUploading, onTriggerUpload, onPrint }: ArchivosTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Proforma PDF - Ver archivo (misma acción que Imprimir/PDF del modal de trabajos) */}
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
                <button
                    type="button"
                    onClick={onPrint}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <Eye className="h-4 w-4" /> Ver archivo
                </button>
            </div>

            {/* Factura de venta */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-emerald-600" /> Factura de venta
                    </h3>
                    <button
                        type="button"
                        onClick={() => onTriggerUpload('taller-facturas')}
                        disabled={isUploading}
                        className="text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        Subir factura (imagen o PDF)
                    </button>
                </div>
                {!orden.factura_url ? (
                    <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-xl">
                        <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium text-sm">No hay factura de venta cargada.</p>
                        <p className="text-slate-400 text-xs mt-1">Puedes subir una imagen o un PDF.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-4">
                        <a
                            href={orden.factura_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
                        >
                            <Eye className="h-4 w-4" /> Ver factura
                        </a>
                        <button
                            type="button"
                            onClick={() => onTriggerUpload('taller-facturas')}
                            disabled={isUploading}
                            className="text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Reemplazar"}
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