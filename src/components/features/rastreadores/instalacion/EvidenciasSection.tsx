"use client";

import { useRef } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";

interface EvidenciasSectionProps {
    evidenciasGuardadas: string[];
    archivosNuevos: File[];
    onFileSelect: (files: File[]) => void;
    onRemoveGuardada: (index: number) => void;
    onRemoveNueva: (index: number) => void;
}

export function EvidenciasSection({
    evidenciasGuardadas,
    archivosNuevos,
    onFileSelect,
    onRemoveGuardada,
    onRemoveNueva
}: EvidenciasSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onFileSelect(Array.from(e.target.files));
        }
    };

    return (
        <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Paperclip size={12} /> Evidencias de Instalación
                </label>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="text-[10px] font-bold text-rose-600 uppercase hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                    <Plus size={12} /> Agregar
                </button>
            </div>

            {evidenciasGuardadas.map((url, idx) => (
                <div key={`old-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-600 truncate">Evidencia #{idx + 1}</span>
                    <button 
                        onClick={() => onRemoveGuardada(idx)} 
                        className="text-slate-400 hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            {archivosNuevos.map((file, idx) => (
                <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                    <button 
                        onClick={() => onRemoveNueva(idx)} 
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple 
                className="hidden" 
            />
        </div>
    );
}
