"use client";

import { Camera, X, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface PhotoUploaderProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    maxFiles?: number;
}

export function PhotoUploader({ files, onFilesChange, maxFiles = 6 }: PhotoUploaderProps) {
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        // Crear URLs de previsualización cuando cambian los archivos
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);

        // Limpieza de memoria
        return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
    }, [files]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const totalFiles = [...files, ...selectedFiles].slice(0, maxFiles);
            onFilesChange(totalFiles);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        onFilesChange(newFiles);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Evidencia Fotográfica
                </h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                    {files.length} / {maxFiles} fotos
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Previsualizaciones */}
                {previews.map((url, index) => (
                    <div key={index} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group bg-slate-100">
                        <img src={url} alt={`Evidencia ${index}`} className="w-full h-full object-cover" />
                        
                        {/* Botón Eliminar (Overlay) */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                type="button"
                                onClick={() => removeFile(index)}
                                className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Botón Agregar */}
                {files.length < maxFiles && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-500 group">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                            <Camera className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold uppercase">Agregar</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />
                    </label>
                )}
            </div>
        </div>
    );
}